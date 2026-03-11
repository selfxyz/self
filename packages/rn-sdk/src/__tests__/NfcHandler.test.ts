// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import { NfcHandler, validateApduCommand } from '../handlers/NfcHandler';
import type { NfcManagerModule, NfcTechEnum } from '../handlers/NfcHandler';
import { BridgeHandlerError } from '../bridge/types';
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

describe('validateApduCommand', () => {
  it('accepts a valid SELECT command', () => {
    expect(() =>
      validateApduCommand([0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01]),
    ).not.toThrow();
  });

  it('accepts a valid SELECT FILE command', () => {
    expect(() => validateApduCommand([0x00, 0xa4, 0x02, 0x0c, 0x02, 0x01, 0x1e])).not.toThrow();
  });

  it('accepts a valid READ BINARY command', () => {
    expect(() => validateApduCommand([0x00, 0xb0, 0x00, 0x00, 0x00])).not.toThrow();
  });

  it('accepts a valid GET CHALLENGE command', () => {
    expect(() => validateApduCommand([0x00, 0x84, 0x00, 0x00, 0x08])).not.toThrow();
  });

  it('accepts a valid secure messaging CLA command', () => {
    expect(() => validateApduCommand([0x0c, 0xb0, 0x00, 0x00, 0x00])).not.toThrow();
  });

  it('accepts a valid secure messaging + chaining CLA command', () => {
    expect(() => validateApduCommand([0x1c, 0xb0, 0x00, 0x00, 0x00])).not.toThrow();
  });

  it('accepts a valid EXTERNAL AUTHENTICATE command', () => {
    expect(() => validateApduCommand([0x00, 0x82, 0x00, 0x00])).not.toThrow();
  });

  it('accepts EXTERNAL AUTHENTICATE with 40-byte cryptogram payload', () => {
    // BAC: 4-byte header + Lc(0x28=40) + 40 bytes data = 45 bytes
    const cmd = [0x00, 0x82, 0x00, 0x00, 0x28, ...Array.from<number>({ length: 40 }).fill(0xab)];
    expect(() => validateApduCommand(cmd)).not.toThrow();
  });

  it('accepts EXTERNAL AUTHENTICATE with payload and Le', () => {
    // 4-byte header + Lc(0x28=40) + 40 bytes data + Le = 46 bytes
    const cmd = [0x00, 0x82, 0x00, 0x00, 0x28, ...Array.from<number>({ length: 40 }).fill(0xab), 0x28];
    expect(() => validateApduCommand(cmd)).not.toThrow();
  });

  it('accepts a valid GENERAL AUTHENTICATE command', () => {
    expect(() => validateApduCommand([0x10, 0x86, 0x00, 0x00])).not.toThrow();
  });

  it('accepts GENERAL AUTHENTICATE with PACE dynamic auth data', () => {
    // PACE: 4-byte header + Lc(0x06) + 6 bytes data = 11 bytes
    const cmd = [0x10, 0x86, 0x00, 0x00, 0x06, 0x7c, 0x04, 0x81, 0x02, 0xaa, 0xbb];
    expect(() => validateApduCommand(cmd)).not.toThrow();
  });

  it('accepts GENERAL AUTHENTICATE with payload and Le', () => {
    const cmd = [0x10, 0x86, 0x00, 0x00, 0x06, 0x7c, 0x04, 0x81, 0x02, 0xaa, 0xbb, 0x00];
    expect(() => validateApduCommand(cmd)).not.toThrow();
  });

  it('accepts a valid MANAGE SECURITY ENVIRONMENT command', () => {
    expect(() => validateApduCommand([0x00, 0x22, 0xc1, 0xa4])).not.toThrow();
  });

  it('accepts a valid GET DATA command', () => {
    expect(() => validateApduCommand([0x00, 0xca, 0x01, 0x00])).not.toThrow();
  });

  it('accepts a valid GET DATA command with Le', () => {
    expect(() => validateApduCommand([0x00, 0xca, 0x01, 0x00, 0x00])).not.toThrow();
  });

  it('accepts a valid READ BINARY odd INS command', () => {
    expect(() => validateApduCommand([0x00, 0xb1, 0x00, 0x00, 0x00])).not.toThrow();
  });

  it('accepts a valid GET DATA odd INS command', () => {
    expect(() => validateApduCommand([0x00, 0xcb, 0x3f, 0xff, 0x03, 0x5c, 0x01, 0x7f])).not.toThrow();
  });

  it('rejects an invalid INS byte', () => {
    expect(() => validateApduCommand([0x00, 0xaa, 0x00, 0x00, 0x00])).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand([0x00, 0xaa, 0x00, 0x00, 0x00])).toThrow('APDU instruction not allowed');
  });

  it('rejects an invalid CLA byte', () => {
    expect(() => validateApduCommand([0x80, 0xb0, 0x00, 0x00, 0x00])).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand([0x80, 0xb0, 0x00, 0x00, 0x00])).toThrow('APDU command class not allowed');
  });

  it('rejects a too-short command', () => {
    expect(() => validateApduCommand([0x00, 0xa4])).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand([0x00, 0xa4])).toThrow('APDU command too short');
  });

  it('rejects malformed APDU length encoding', () => {
    expect(() => validateApduCommand([0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0])).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand([0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0])).toThrow('APDU length encoding not allowed');
  });

  it('rejects SELECT command with unexpected AID', () => {
    expect(() =>
      validateApduCommand([0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    ).toThrow(BridgeHandlerError);
    expect(() =>
      validateApduCommand([0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    ).toThrow('SELECT command parameters not allowed');
  });

  it('rejects READ BINARY command with data payload', () => {
    expect(() => validateApduCommand([0x00, 0xb0, 0x00, 0x00, 0x01, 0xff])).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand([0x00, 0xb0, 0x00, 0x00, 0x01, 0xff])).toThrow('READ BINARY command format not allowed');
  });

  it('rejects MSE command with unexpected parameters', () => {
    expect(() => validateApduCommand([0x00, 0x22, 0x41, 0xa4])).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand([0x00, 0x22, 0x41, 0xa4])).toThrow('MSE command parameters not allowed');
  });

  it('rejects GET DATA (CA) with command data payload', () => {
    expect(() => validateApduCommand([0x00, 0xca, 0x01, 0x00, 0x01, 0x5c])).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand([0x00, 0xca, 0x01, 0x00, 0x01, 0x5c])).toThrow('GET DATA command format not allowed');
  });

  it('rejects GET DATA (CB) without command data field', () => {
    expect(() => validateApduCommand([0x00, 0xcb, 0x01, 0x00])).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand([0x00, 0xcb, 0x01, 0x00])).toThrow('GET DATA command data required');
  });

  it('sets APDU_REJECTED error code on rejection', () => {
    try {
      validateApduCommand([0x80, 0xb0, 0x00, 0x00]);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BridgeHandlerError);
      expect((err as BridgeHandlerError).code).toBe('APDU_REJECTED');
    }
  });
});

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

    it('returns connected result without exposing tag identifier', async () => {
      (mockNfc.manager.getTag as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'tag-456' });

      const result = await handler.handle('scan', { passportNumber: 'X' }) as Record<string, unknown>;
      expect(result).toMatchObject({ connected: true, techType: 'IsoDep' });
      expect(result).not.toHaveProperty('tagId');
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

    it('accepts compatible interindustry CLA variants', async () => {
      (mockNfc.manager.transceive as ReturnType<typeof vi.fn>).mockResolvedValueOnce([0x90, 0x00]);

      const result = await handler.handle('scan', {
        apduCommands: ['1CB0000000'],
      }) as Record<string, unknown>;

      expect(result.apduResponses).toEqual(['9000']);
      expect(mockNfc.manager.transceive).toHaveBeenCalledWith([0x1c, 0xb0, 0x00, 0x00, 0x00]);
    });

    it('rejects disallowed APDU SELECT parameters before transceive', async () => {
      try {
        await handler.handle('scan', {
          apduCommands: ['00A4040007A0000000000000'],
        });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe('APDU_REJECTED');
        expect((err as Error).message).toBe('SELECT command parameters not allowed');
        expect((err as { details?: Record<string, unknown> }).details).toMatchObject({
          commandIndex: 0,
          totalCommands: 1,
          acceptedCount: 0,
          rejectedCount: 1,
          timedOutCount: 0,
        });
      }

      expect(mockNfc.manager.transceive).not.toHaveBeenCalled();
    });

    it('rejects GET DATA (CB) without command data before transceive', async () => {
      try {
        await handler.handle('scan', {
          apduCommands: ['00CB0100'],
        });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe('APDU_REJECTED');
        expect((err as Error).message).toBe('GET DATA command data required');
        expect((err as { details?: Record<string, unknown> }).details).toMatchObject({
          commandIndex: 0,
          totalCommands: 1,
          acceptedCount: 0,
          rejectedCount: 1,
          timedOutCount: 0,
        });
      }

      expect(mockNfc.manager.transceive).not.toHaveBeenCalled();
    });

    it('accepts APDU at max short-APDU length (261 bytes)', async () => {
      // EXTERNAL AUTHENTICATE: 4-byte header + 1-byte Lc(255) + 255 data + 1-byte Le = 261 bytes
      const maxHex = '00820000' + 'FF' + 'AA'.repeat(255) + '00';
      expect(maxHex.length / 2).toBe(261);

      (mockNfc.manager.transceive as ReturnType<typeof vi.fn>).mockResolvedValueOnce([0x90, 0x00]);
      const result = await handler.handle('scan', { apduCommands: [maxHex] }) as Record<string, unknown>;
      expect(result.apduResponses).toEqual(['9000']);
    });

    it('rejects APDU exceeding max short-APDU length (262 bytes)', async () => {
      const oversizedHex = '00820000' + 'FF' + 'AA'.repeat(256) + '00';
      expect(oversizedHex.length / 2).toBe(262);

      try {
        await handler.handle('scan', { apduCommands: [oversizedHex] });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe('INVALID_PARAMS');
        expect((err as Error).message).toBe('APDU command exceeds maximum length');
      }

      expect(mockNfc.manager.transceive).not.toHaveBeenCalled();
    });

    it('attaches audit details to INVALID_PARAMS for malformed APDU hex', async () => {
      try {
        await handler.handle('scan', {
          apduCommands: ['GG'],
        });
        expect.unreachable('Should have thrown');
      } catch (err: unknown) {
        expect((err as { code: string }).code).toBe('INVALID_PARAMS');
        expect((err as Error).message).toBe('Invalid APDU hex command format');
        expect((err as { details?: Record<string, unknown> }).details).toMatchObject({
          commandIndex: 0,
          totalCommands: 1,
          acceptedCount: 0,
          rejectedCount: 0,
          timedOutCount: 0,
        });
      }
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
        expect((err as Error).message).toBe('NFC scan failed');
      }
    });

    it('throws NFC_APDU_TIMEOUT when transceive hangs', async () => {
      vi.useFakeTimers();
      try {
        handler = new NfcHandler(router, mockNfc, { apduTimeoutMs: 1 });
        (mockNfc.manager.transceive as ReturnType<typeof vi.fn>).mockImplementation(
          () => new Promise(() => {}),
        );

        // Attach rejection handler immediately to prevent unhandled rejection
        const assertion = expect(
          handler.handle('scan', { apduCommands: ['00A4040007A0000002471001'] }),
        ).rejects.toMatchObject({
          code: 'NFC_APDU_TIMEOUT',
          message: 'NFC APDU command timed out',
          details: {
            commandIndex: 0,
            totalCommands: 1,
            acceptedCount: 0,
            rejectedCount: 0,
            timedOutCount: 1,
          },
        });

        await vi.runAllTimersAsync();
        await assertion;
      } finally {
        vi.useRealTimers();
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

describe('NfcHandler redaction regression', () => {
  function createReadyNfc() {
    const nfc = createMockNfc();
    (nfc.manager.isSupported as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (nfc.manager.start as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (nfc.manager.requestTechnology as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (nfc.manager.getTag as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'tag-1' });
    (nfc.manager.transceive as ReturnType<typeof vi.fn>).mockResolvedValue([0x90, 0x00]);
    (nfc.manager.cancelTechnologyRequest as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    return nfc;
  }

  it('never leaks attacker-controlled hex in parse error messages', async () => {
    const handler = new NfcHandler(
      { pushEvent: vi.fn() } as unknown as MessageRouter,
      createReadyNfc(),
    );
    const maliciousHex = 'DEADBEEF_NOTVALID';

    try {
      await handler.handle('scan', { apduCommands: [maliciousHex] });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BridgeHandlerError);
      const msg = (err as BridgeHandlerError).message;
      expect(msg).not.toContain('DEADBEEF');
      expect(msg).not.toContain(maliciousHex);
    }
  });

  it('never leaks rejected APDU command bytes in validation error messages', async () => {
    const handler = new NfcHandler(
      { pushEvent: vi.fn() } as unknown as MessageRouter,
      createReadyNfc(),
    );
    const rejectedHex = '80B0000000';

    try {
      await handler.handle('scan', { apduCommands: [rejectedHex] });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BridgeHandlerError);
      const msg = (err as BridgeHandlerError).message;
      expect(msg).not.toContain('80B0');
      expect(msg).not.toContain(rejectedHex);
    }
  });

  it('never leaks native NFC error details through the bridge', async () => {
    const mockNfc = createReadyNfc();
    (mockNfc.manager.transceive as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Sensitive native stack: 0xDEAD at /dev/nfc'),
    );
    const handler = new NfcHandler(
      { pushEvent: vi.fn() } as unknown as MessageRouter,
      mockNfc,
    );

    try {
      await handler.handle('scan', { apduCommands: ['00A4040007A0000002471001'] });
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BridgeHandlerError);
      const msg = (err as BridgeHandlerError).message;
      expect(msg).not.toContain('Sensitive');
      expect(msg).not.toContain('0xDEAD');
      expect(msg).toBe('NFC scan failed');
    }
  });
});
