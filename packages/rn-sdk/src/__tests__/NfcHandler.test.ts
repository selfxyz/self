// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import { NfcHandler } from '../handlers/NfcHandler';
import type { NfcManagerModule, NfcTechEnum } from '../handlers/NfcHandler';
import { MessageRouter } from '../bridge/MessageRouter';

function createMockNfc() {
  const manager: NfcManagerModule = {
    isSupported: vi.fn(),
    start: vi.fn(),
    requestTechnology: vi.fn(),
    getTag: vi.fn(),
    transceive: vi.fn(),
    cancelTechnologyRequest: vi.fn(),
  };
  const tech: NfcTechEnum = {
    IsoDep: 'IsoDep',
    NfcA: 'NfcA',
  };
  return { manager, tech };
}

describe('NfcHandler', () => {
  let handler: NfcHandler;
  let router: MessageRouter;
  let pushEventSpy: ReturnType<typeof vi.spyOn>;
  let mockNfc: ReturnType<typeof createMockNfc>;

  beforeEach(() => {
    vi.clearAllMocks();
    const sendToWebView = vi.fn();
    router = new MessageRouter({ sendToWebView });
    pushEventSpy = vi.spyOn(router, 'pushEvent');
    mockNfc = createMockNfc();
    handler = new NfcHandler(router, mockNfc);
  });

  it('has domain "nfc"', () => {
    expect(handler.domain).toBe('nfc');
  });

  describe('isSupported', () => {
    it('returns true when NFC supported', async () => {
      (mockNfc.manager.isSupported as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const result = await handler.handle('isSupported', {});
      expect(result).toBe(true);
      expect(mockNfc.manager.isSupported).toHaveBeenCalledOnce();
    });

    it('returns false on unsupported device', async () => {
      (mockNfc.manager.isSupported as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      const result = await handler.handle('isSupported', {});
      expect(result).toBe(false);
    });
  });

  describe('cancelScan', () => {
    it('calls NfcManager.cancelTechnologyRequest()', async () => {
      (mockNfc.manager.cancelTechnologyRequest as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const result = await handler.handle('cancelScan', {});
      expect(result).toEqual({ cancelled: true });
      expect(mockNfc.manager.cancelTechnologyRequest).toHaveBeenCalledOnce();
    });
  });

  describe('scan', () => {
    beforeEach(() => {
      (mockNfc.manager.isSupported as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (mockNfc.manager.start as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockNfc.manager.requestTechnology as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (mockNfc.manager.getTag as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'tag-123' });
      (mockNfc.manager.transceive as ReturnType<typeof vi.fn>).mockResolvedValue([0x90, 0x00]);
      (mockNfc.manager.cancelTechnologyRequest as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it('throws NFC_NOT_SUPPORTED when device lacks NFC', async () => {
      (mockNfc.manager.isSupported as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      try {
        await handler.handle('scan', { passportNumber: 'X' });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe('NFC_NOT_SUPPORTED');
        expect((err as Error).message).toBe('NFC is not supported on this device');
      }
    });

    it('streams progress events during scan', async () => {
      await handler.handle('scan', {
        passportNumber: 'AB1234567',
        dateOfBirth: '900115',
        dateOfExpiry: '300115',
      });

      const progressCalls = pushEventSpy.mock.calls.filter(
        (call) => call[0] === 'nfc' && call[1] === 'scanProgress',
      );
      expect(progressCalls.length).toBeGreaterThanOrEqual(3);

      const steps = progressCalls.map((call) => (call[2] as { step: string }).step);
      expect(steps).toContain('initializing');
      expect(steps).toContain('waiting_for_tag');
      expect(steps).toContain('tag_discovered');
      expect(steps).toContain('connected');
    });

    it('returns connected result with tag info', async () => {
      (mockNfc.manager.getTag as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'tag-456' });

      const result = await handler.handle('scan', { passportNumber: 'X' }) as Record<string, unknown>;
      expect(result).toMatchObject({
        connected: true,
        tagId: 'tag-456',
      });
    });

    it('returns APDU responses when apduCommands are provided', async () => {
      (mockNfc.manager.transceive as ReturnType<typeof vi.fn>).mockResolvedValueOnce([0x90, 0x00]);
      (mockNfc.manager.transceive as ReturnType<typeof vi.fn>).mockResolvedValueOnce([0x6A, 0x82]);

      const result = await handler.handle('scan', {
        apduCommands: ['00A4040007A0000002471001', '00B0000000'],
      }) as Record<string, unknown>;

      expect(result.apduResponses).toEqual(['9000', '6A82']);
      expect(mockNfc.manager.transceive).toHaveBeenCalledTimes(2);
    });

    it('throws NFC_APDU_NOT_SUPPORTED when transceive is unavailable', async () => {
      delete (mockNfc.manager as Partial<NfcManagerModule>).transceive;

      try {
        await handler.handle('scan', { apduCommands: ['00A4040000'] });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe('NFC_APDU_NOT_SUPPORTED');
      }
    });

    it('throws NFC_SCAN_FAILED on NFC error', async () => {
      (mockNfc.manager.requestTechnology as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('NFC tag lost'),
      );

      try {
        await handler.handle('scan', {});
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe('NFC_SCAN_FAILED');
        expect((err as Error).message).toBe('NFC tag lost');
      }
    });
  });

  describe('unknown method', () => {
    it('throws METHOD_NOT_FOUND', async () => {
      await expect(handler.handle('transmit', {})).rejects.toThrow(
        'Unknown nfc method: transmit',
      );
    });
  });
});
