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
import type { MessageRouter } from '../../bridge/MessageRouter';

const SCAN_PARAMS = {
  passportNumber: 'AB1234567',
  dateOfBirth: '900115',
  dateOfExpiry: '300115',
};

function createHandler(): NfcHandler {
  return new NfcHandler({ pushEvent: vi.fn() } as unknown as MessageRouter);
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(nativeModules)) {
    delete nativeModules[key];
  }
});

describe('NfcHandler native module resolution (android)', () => {
  beforeEach(() => {
    platform.OS = 'android';
  });

  it('prefers SelfPassportReader when both modules are present', async () => {
    const selfScan = vi.fn().mockResolvedValue('self');
    const legacyScan = vi.fn().mockResolvedValue('legacy');
    nativeModules.SelfPassportReader = { scan: selfScan };
    nativeModules.RNPassportReader = { scan: legacyScan };

    const result = await createHandler().handle('scanPassport', SCAN_PARAMS);

    expect(result).toBe('self');
    expect(selfScan).toHaveBeenCalledOnce();
    expect(legacyScan).not.toHaveBeenCalled();
  });

  it('falls back to RNPassportReader when only the legacy module exists', async () => {
    const legacyScan = vi.fn().mockResolvedValue('legacy');
    nativeModules.RNPassportReader = { scan: legacyScan };

    const result = await createHandler().handle('scanPassport', SCAN_PARAMS);

    expect(result).toBe('legacy');
    expect(legacyScan).toHaveBeenCalledOnce();
  });

  it('throws NOT_AVAILABLE when neither module is registered', async () => {
    try {
      await createHandler().handle('scanPassport', SCAN_PARAMS);
      expect.unreachable('Should have thrown');
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe('NOT_AVAILABLE');
    }
  });
});

describe('NfcHandler native module resolution (ios)', () => {
  beforeEach(() => {
    platform.OS = 'ios';
  });

  it('prefers SelfPassportReader when both modules are present', async () => {
    const selfScanPassport = vi.fn().mockResolvedValue('self');
    const legacyScanPassport = vi.fn().mockResolvedValue('legacy');
    nativeModules.SelfPassportReader = { scanPassport: selfScanPassport };
    nativeModules.PassportReader = { scanPassport: legacyScanPassport };

    const result = await createHandler().handle('scanPassport', SCAN_PARAMS);

    expect(result).toBe('self');
    expect(selfScanPassport).toHaveBeenCalledOnce();
    expect(selfScanPassport).toHaveBeenCalledWith(
      'AB1234567',
      '900115',
      '300115',
      '',
      false,
      false,
      false,
      false,
      false,
      '',
    );
    expect(legacyScanPassport).not.toHaveBeenCalled();
  });

  it('falls back to PassportReader when only the legacy module exists', async () => {
    const legacyScanPassport = vi.fn().mockResolvedValue('legacy');
    nativeModules.PassportReader = { scanPassport: legacyScanPassport };

    const result = await createHandler().handle('scanPassport', SCAN_PARAMS);

    expect(result).toBe('legacy');
    expect(legacyScanPassport).toHaveBeenCalledOnce();
  });

  it('throws NOT_AVAILABLE when neither module is registered', async () => {
    try {
      await createHandler().handle('scanPassport', SCAN_PARAMS);
      expect.unreachable('Should have thrown');
    } catch (err: unknown) {
      expect((err as { code: string }).code).toBe('NOT_AVAILABLE');
    }
  });
});
