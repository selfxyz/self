// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi } from 'vitest';
import { validateApduCommand, NfcHandler } from '../src/handlers/NfcHandler';
import type { NfcManagerModule, NfcTechEnum } from '../src/handlers/NfcHandler';
import { BridgeHandlerError } from '../src/bridge/types';
import type { MessageRouter } from '../src/bridge/MessageRouter';

describe('validateApduCommand', () => {
  it('accepts a valid SELECT command', () => {
    // 00 A4 04 00 07 A0000002471001
    const bytes = [0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid SELECT FILE command', () => {
    // 00 A4 02 0C 02 01 1E
    const bytes = [0x00, 0xa4, 0x02, 0x0c, 0x02, 0x01, 0x1e];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid READ BINARY command', () => {
    // 00 B0 00 00 00
    const bytes = [0x00, 0xb0, 0x00, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid GET CHALLENGE command', () => {
    // 00 84 00 00 08
    const bytes = [0x00, 0x84, 0x00, 0x00, 0x08];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid secure messaging CLA command', () => {
    // 0C B0 00 00 00
    const bytes = [0x0c, 0xb0, 0x00, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid secure messaging + chaining CLA command', () => {
    // 1C B0 00 00 00
    const bytes = [0x1c, 0xb0, 0x00, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid EXTERNAL AUTHENTICATE command', () => {
    // 00 82 00 00
    const bytes = [0x00, 0x82, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid GENERAL AUTHENTICATE command', () => {
    // 10 86 00 00
    const bytes = [0x10, 0x86, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid MANAGE SECURITY ENVIRONMENT command', () => {
    // 00 22 C1 A4
    const bytes = [0x00, 0x22, 0xc1, 0xa4];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid GET DATA command', () => {
    // 00 CA 01 00
    const bytes = [0x00, 0xca, 0x01, 0x00];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid GET DATA command with Le', () => {
    // 00 CA 01 00 00
    const bytes = [0x00, 0xca, 0x01, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid READ BINARY odd INS command', () => {
    // 00 B1 00 00 00
    const bytes = [0x00, 0xb1, 0x00, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('accepts a valid GET DATA odd INS command', () => {
    // 00 CB 3F FF 03 5C 01 7F
    const bytes = [0x00, 0xcb, 0x3f, 0xff, 0x03, 0x5c, 0x01, 0x7f];
    expect(() => validateApduCommand(bytes)).not.toThrow();
  });

  it('rejects an invalid INS byte', () => {
    // 00 AA 00 00 00
    const bytes = [0x00, 0xaa, 0x00, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('APDU instruction not allowed');
  });

  it('rejects an invalid CLA byte', () => {
    // 80 B0 00 00 00
    const bytes = [0x80, 0xb0, 0x00, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('APDU command class not allowed');
  });

  it('rejects a too-short command', () => {
    // 00 A4
    const bytes = [0x00, 0xa4];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('APDU command too short');
  });

  it('rejects malformed APDU length encoding', () => {
    // Lc=07 but only one data byte present
    const bytes = [0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('APDU length encoding not allowed');
  });

  it('rejects SELECT command with unexpected AID', () => {
    const bytes = [0x00, 0xa4, 0x04, 0x00, 0x07, 0xa0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('SELECT command parameters not allowed');
  });

  it('rejects READ BINARY command with data payload', () => {
    const bytes = [0x00, 0xb0, 0x00, 0x00, 0x01, 0xff];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('READ BINARY command format not allowed');
  });

  it('rejects MSE command with unexpected parameters', () => {
    const bytes = [0x00, 0x22, 0x41, 0xa4];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('MSE command parameters not allowed');
  });

  it('rejects GET DATA (CA) with command data payload', () => {
    const bytes = [0x00, 0xca, 0x01, 0x00, 0x01, 0x5c];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('GET DATA command format not allowed');
  });

  it('rejects GET DATA (CB) without command data field', () => {
    const bytes = [0x00, 0xcb, 0x01, 0x00];
    expect(() => validateApduCommand(bytes)).toThrow(BridgeHandlerError);
    expect(() => validateApduCommand(bytes)).toThrow('GET DATA command data required');
  });

  it('sets APDU_REJECTED error code on rejection', () => {
    const bytes = [0x80, 0xb0, 0x00, 0x00];
    try {
      validateApduCommand(bytes);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BridgeHandlerError);
      expect((err as BridgeHandlerError).code).toBe('APDU_REJECTED');
    }
  });
});

function createMockNfc(overrides?: Partial<NfcManagerModule>): {
  manager: NfcManagerModule;
  tech: NfcTechEnum;
} {
  return {
    manager: {
      isSupported: vi.fn().mockResolvedValue(true),
      start: vi.fn().mockResolvedValue(undefined),
      requestTechnology: vi.fn().mockResolvedValue(undefined),
      getTag: vi.fn().mockResolvedValue({ id: 'tag-1' }),
      transceive: vi.fn().mockResolvedValue([0x90, 0x00]),
      cancelTechnologyRequest: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    },
    tech: { IsoDep: 'IsoDep' },
  };
}

function createMockRouter(): MessageRouter {
  return { pushEvent: vi.fn() } as unknown as MessageRouter;
}

describe('NfcHandler redaction regression', () => {
  it('never leaks attacker-controlled hex in parse error messages', async () => {
    const nfc = createMockNfc();
    const handler = new NfcHandler(createMockRouter(), nfc);
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
    const nfc = createMockNfc();
    const handler = new NfcHandler(createMockRouter(), nfc);
    // Valid hex but disallowed CLA 0x80
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
    const nfc = createMockNfc({
      transceive: vi.fn().mockRejectedValue(new Error('Sensitive native stack: 0xDEAD at /dev/nfc')),
    });
    const handler = new NfcHandler(createMockRouter(), nfc);
    // Valid eMRTD SELECT command
    const validHex = '00A4040007A0000002471001';

    try {
      await handler.handle('scan', { apduCommands: [validHex] });
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
