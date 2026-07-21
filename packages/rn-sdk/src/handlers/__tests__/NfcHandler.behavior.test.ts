// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { nativeModules, platform } = vi.hoisted(() => ({
  nativeModules: {} as Record<string, unknown>,
  platform: { OS: 'android' } as { OS: string },
}));

vi.mock('react-native', () => ({
  NativeModules: nativeModules,
  Platform: platform,
}));

import { NfcHandler } from '../NfcHandler';
import type { PassportReaderModule } from '../NfcHandler';
import type { NfcDeps } from '../NfcHandler';
import type { MessageRouter } from '../../bridge/MessageRouter';

const SCAN_PARAMS = {
  passportNumber: 'AB1234567',
  dateOfBirth: '900115',
  dateOfExpiry: '300115',
};

function router(): MessageRouter {
  return { pushEvent: vi.fn() } as unknown as MessageRouter;
}

function nfcStub(): NfcDeps {
  return {
    manager: {
      isSupported: vi.fn().mockResolvedValue(true),
      start: vi.fn().mockResolvedValue(undefined),
      requestTechnology: vi.fn().mockResolvedValue(undefined),
      getTag: vi.fn().mockResolvedValue(null),
      cancelTechnologyRequest: vi.fn().mockResolvedValue(undefined),
    },
    tech: { IsoDep: 'IsoDep' },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  platform.OS = 'android';
  for (const key of Object.keys(nativeModules)) {
    delete nativeModules[key];
  }
});

describe('NfcHandler.isAvailable', () => {
  it('is true when a passport reader is present', () => {
    const reader: PassportReaderModule = { scan: vi.fn() };
    const handler = new NfcHandler(router(), undefined, {
      passportReader: reader,
    });
    expect(handler.isAvailable()).toBe(true);
  });

  it('is false when only nfc-manager is present (no passport reader)', () => {
    const handler = new NfcHandler(router(), nfcStub());
    expect(handler.isAvailable()).toBe(false);
  });
});

describe('NfcHandler scanPassport result decoding', () => {
  it('parses a JSON string result into an object', async () => {
    const doc = { documentCategory: 'passport', mrz: 'X' };
    const reader: PassportReaderModule = {
      scan: vi.fn().mockResolvedValue(JSON.stringify(doc)),
    };
    const handler = new NfcHandler(router(), undefined, {
      passportReader: reader,
    });

    const result = await handler.handle('scanPassport', SCAN_PARAMS);

    expect(result).toEqual(doc);
  });

  it('passes an already-decoded object result through unchanged', async () => {
    const doc = { documentCategory: 'passport' };
    const reader: PassportReaderModule = {
      scan: vi.fn().mockResolvedValue(doc),
    };
    const handler = new NfcHandler(router(), undefined, {
      passportReader: reader,
    });

    const result = await handler.handle('scanPassport', SCAN_PARAMS);

    expect(result).toEqual(doc);
  });

  it('throws NFC_SCAN_FAILED when the string result is not valid JSON', async () => {
    const reader: PassportReaderModule = {
      scan: vi.fn().mockResolvedValue('not-json'),
    };
    const handler = new NfcHandler(router(), undefined, {
      passportReader: reader,
    });

    await expect(handler.handle('scanPassport', SCAN_PARAMS)).rejects.toMatchObject(
      { code: 'NFC_SCAN_FAILED' },
    );
  });
});

describe('NfcHandler cancelScan routing', () => {
  it('cancels the passport reader without nfc-manager installed', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const reader: PassportReaderModule = { scan: vi.fn(), cancel };
    const handler = new NfcHandler(router(), undefined, {
      passportReader: reader,
    });

    const result = await handler.handle('cancelScan', {});

    expect(result).toEqual({ cancelled: true });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('cancels both the passport reader and nfc-manager when both exist', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const reader: PassportReaderModule = { scan: vi.fn(), cancel };
    const nfc = nfcStub();
    const handler = new NfcHandler(router(), nfc, { passportReader: reader });

    await handler.handle('cancelScan', {});

    expect(cancel).toHaveBeenCalledOnce();
    expect(nfc.manager.cancelTechnologyRequest).toHaveBeenCalledOnce();
  });

  it('resets the scanning flag so a subsequent scan is not blocked', async () => {
    let resolveScan: (value: string) => void = () => {};
    const scan = vi.fn().mockImplementation(
      () =>
        new Promise<string>(resolve => {
          resolveScan = resolve;
        }),
    );
    const reader: PassportReaderModule = { scan, cancel: vi.fn() };
    const handler = new NfcHandler(router(), undefined, {
      passportReader: reader,
    });

    const first = handler.handle('scanPassport', SCAN_PARAMS);
    first.catch(() => {});
    await handler.handle('cancelScan', {});

    // Second scan must not be rejected with ALREADY_SCANNING.
    const second = handler.handle('scanPassport', SCAN_PARAMS);
    resolveScan(JSON.stringify({ documentCategory: 'passport' }));

    await expect(second).resolves.toEqual({ documentCategory: 'passport' });
  });
});
