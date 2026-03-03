// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';
import type { MessageRouter } from '../bridge/MessageRouter';

export interface NfcManagerModule {
  isSupported(): Promise<boolean>;
  start(): Promise<void>;
  requestTechnology(tech: string): Promise<void>;
  getTag(): Promise<{ id?: string } | null>;
  transceive?(command: number[]): Promise<number[]>;
  cancelTechnologyRequest(): Promise<void>;
}

export interface NfcTechEnum {
  IsoDep: string;
  [key: string]: string;
}

interface NfcDeps {
  manager: NfcManagerModule;
  tech: NfcTechEnum;
}

interface NfcHandlerOptions {
  apduTimeoutMs?: number;
}

const DEFAULT_APDU_TIMEOUT_MS = 10_000;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => Error,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(onTimeout());
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function parseApduCommand(hexCommand: string): number[] {
  const normalized = hexCommand.trim().replace(/\s+/g, '').toUpperCase();
  if (!/^[0-9A-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new BridgeHandlerError(
      'INVALID_PARAMS',
      'Invalid APDU hex command format',
    );
  }

  const bytes: number[] = [];
  for (let i = 0; i < normalized.length; i += 2) {
    bytes.push(Number.parseInt(normalized.slice(i, i + 2), 16));
  }
  return bytes;
}

function isAllowedCla(cla: number): boolean {
  // Accept ISO 7816 interindustry class space (0x00-0x7F), including
  // secure-messaging/chaining/logical-channel variants, to avoid compatibility
  // regressions across readers/chips. Reject proprietary class space (0x80-0xFF).
  return cla >= 0x00 && cla <= 0x7f;
}

// ISO 7816-4 instructions used in eMRTD reading
const ALLOWED_INS = new Set([
  0xa4, // SELECT (applet/file selection)
  0xb0, // READ BINARY
  0xb1, // READ BINARY (odd INS)
  0x84, // GET CHALLENGE (BAC auth)
  0x82, // EXTERNAL AUTHENTICATE (BAC auth)
  0x86, // GENERAL AUTHENTICATE (PACE)
  0x22, // MANAGE SECURITY ENVIRONMENT (MSE:SET AT)
  0xca, // GET DATA
  0xcb, // GET DATA (odd INS)
]);

const E_MRTD_APPLET_AID = [0xa0, 0x00, 0x00, 0x02, 0x47, 0x10, 0x01];

function hasValidShortApduEncoding(bytes: number[]): boolean {
  if (bytes.length === 4 || bytes.length === 5) {
    return true;
  }

  const lc = bytes[4];
  if (lc === 0) {
    // Extended length APDUs are intentionally disallowed in this bridge.
    return false;
  }

  return bytes.length === 5 + lc || bytes.length === 6 + lc;
}

function isAidSelectCommand(bytes: number[]): boolean {
  const p1 = bytes[2];
  const p2 = bytes[3];
  if (p1 !== 0x04 || (p2 !== 0x00 && p2 !== 0x0c)) {
    return false;
  }
  if (bytes.length < 5) {
    return false;
  }

  const lc = bytes[4];
  if (lc !== E_MRTD_APPLET_AID.length) {
    return false;
  }
  if (bytes.length !== 5 + lc && bytes.length !== 6 + lc) {
    return false;
  }

  return E_MRTD_APPLET_AID.every((value, index) => bytes[5 + index] === value);
}

function isFileSelectCommand(bytes: number[]): boolean {
  const p1 = bytes[2];
  const p2 = bytes[3];
  if (p1 !== 0x02 || (p2 !== 0x00 && p2 !== 0x0c)) {
    return false;
  }
  if (bytes.length < 7) {
    return false;
  }

  const lc = bytes[4];
  if (lc !== 0x02) {
    return false;
  }

  return bytes.length === 7 || bytes.length === 8;
}

export function validateApduCommand(bytes: number[]): void {
  if (bytes.length < 4) {
    throw new BridgeHandlerError('APDU_REJECTED', 'APDU command too short');
  }
  if (!hasValidShortApduEncoding(bytes)) {
    throw new BridgeHandlerError('APDU_REJECTED', 'APDU length encoding not allowed');
  }

  const cla = bytes[0];
  const ins = bytes[1];

  if (!isAllowedCla(cla)) {
    throw new BridgeHandlerError('APDU_REJECTED', 'APDU command class not allowed');
  }
  if (!ALLOWED_INS.has(ins)) {
    throw new BridgeHandlerError('APDU_REJECTED', 'APDU instruction not allowed');
  }

  switch (ins) {
    case 0xa4: {
      if (!isAidSelectCommand(bytes) && !isFileSelectCommand(bytes)) {
        throw new BridgeHandlerError('APDU_REJECTED', 'SELECT command parameters not allowed');
      }
      break;
    }
    case 0xb0:
    case 0xb1: {
      if (bytes.length !== 5) {
        throw new BridgeHandlerError('APDU_REJECTED', 'READ BINARY command format not allowed');
      }
      break;
    }
    case 0x84: {
      if (bytes.length !== 5 || bytes[2] !== 0x00 || bytes[3] !== 0x00) {
        throw new BridgeHandlerError('APDU_REJECTED', 'GET CHALLENGE command format not allowed');
      }
      break;
    }
    case 0x82: {
      if (bytes[2] !== 0x00 || bytes[3] !== 0x00) {
        throw new BridgeHandlerError(
          'APDU_REJECTED',
          'EXTERNAL AUTHENTICATE command parameters not allowed',
        );
      }
      break;
    }
    case 0x86: {
      if (bytes[2] !== 0x00 || bytes[3] !== 0x00) {
        throw new BridgeHandlerError(
          'APDU_REJECTED',
          'GENERAL AUTHENTICATE command parameters not allowed',
        );
      }
      break;
    }
    case 0x22: {
      if (bytes[2] !== 0xc1 || bytes[3] !== 0xa4) {
        throw new BridgeHandlerError(
          'APDU_REJECTED',
          'MSE command parameters not allowed',
        );
      }
      break;
    }
    case 0xca: {
      // GET DATA (CA) is allowed as case-1/case-2 only (no command data payload).
      if (bytes.length !== 4 && bytes.length !== 5) {
        throw new BridgeHandlerError('APDU_REJECTED', 'GET DATA command format not allowed');
      }
      break;
    }
    case 0xcb: {
      // GET DATA (CB) must carry a non-empty command data field.
      if (bytes.length < 6 || bytes[4] === 0) {
        throw new BridgeHandlerError('APDU_REJECTED', 'GET DATA command data required');
      }
      break;
    }
    default:
      // Command already validated via class/instruction + APDU structure checks.
      break;
  }
}

function toHex(bytes: number[]): string {
  return bytes
    .map((value) => value.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

function loadNfc(): NfcDeps | undefined {
  try {
    const mod = require('react-native-nfc-manager');
    return { manager: mod.default, tech: mod.NfcTech };
  } catch {
    return undefined;
  }
}

export class NfcHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'nfc';
  private readonly router: MessageRouter;
  private readonly nfc: NfcDeps | undefined;
  private readonly apduTimeoutMs: number;
  private scanning = false;

  constructor(router: MessageRouter, nfc?: NfcDeps, options?: NfcHandlerOptions) {
    this.router = router;
    this.nfc = nfc ?? loadNfc();
    this.apduTimeoutMs = options?.apduTimeoutMs ?? DEFAULT_APDU_TIMEOUT_MS;
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.nfc) {
      throw new BridgeHandlerError('NOT_AVAILABLE', 'react-native-nfc-manager is not installed');
    }

    switch (method) {
      case 'isSupported':
        return this.nfc.manager.isSupported();
      case 'scan':
        return this.scan(params);
      case 'cancelScan':
        return this.cancelScan();
      default:
        throw new BridgeHandlerError('METHOD_NOT_FOUND', `Unknown nfc method: ${method}`);
    }
  }

  private async scan(params: Record<string, unknown>): Promise<unknown> {
    const { manager, tech } = this.nfc!;

    if (this.scanning) {
      throw new BridgeHandlerError('ALREADY_SCANNING', 'An NFC scan is already in progress');
    }

    const supported = await manager.isSupported();
    if (!supported) {
      throw new BridgeHandlerError('NFC_NOT_SUPPORTED', 'NFC is not supported on this device');
    }

    this.scanning = true;
    this.pushProgress('initializing', 0);

    try {
      await manager.start();
      this.pushProgress('waiting_for_tag', 10);

      const nfcTech = tech.IsoDep;

      await manager.requestTechnology(nfcTech);
      this.pushProgress('tag_discovered', 30);

      const tag = await manager.getTag();
      this.pushProgress('connected', 50);

      const apduCommands = Array.isArray(params.apduCommands)
        ? params.apduCommands.filter((entry): entry is string => typeof entry === 'string')
        : [];
      let apduResponses: string[] | undefined;
      if (apduCommands.length > 0) {
        let acceptedCount = 0;
        let rejectedCount = 0;
        let timedOutCount = 0;
        const totalCommands = apduCommands.length;

        const auditDetails = (commandIndex: number): Record<string, unknown> => ({
          commandIndex,
          totalCommands,
          acceptedCount,
          rejectedCount,
          timedOutCount,
        });

        if (typeof manager.transceive !== 'function') {
          throw new BridgeHandlerError(
            'NFC_APDU_NOT_SUPPORTED',
            'NFC transceive is not supported by the installed nfc manager',
          );
        }

        this.pushProgress('apdu_exchange', 70);
        apduResponses = [];
        for (const [commandIndex, command] of apduCommands.entries()) {
          let commandBytes: number[];
          try {
            commandBytes = parseApduCommand(command);
          } catch (err) {
            if (err instanceof BridgeHandlerError) {
              throw new BridgeHandlerError(err.code, err.message, auditDetails(commandIndex));
            }
            throw err;
          }

          try {
            validateApduCommand(commandBytes);
          } catch (err) {
            if (err instanceof BridgeHandlerError) {
              rejectedCount += 1;
              throw new BridgeHandlerError(err.code, err.message, auditDetails(commandIndex));
            }
            throw err;
          }

          let responseBytes: number[];
          try {
            responseBytes = await withTimeout(
              manager.transceive(commandBytes),
              this.apduTimeoutMs,
              () => new BridgeHandlerError('NFC_APDU_TIMEOUT', 'NFC APDU command timed out'),
            );
          } catch (err) {
            if (err instanceof BridgeHandlerError && err.code === 'NFC_APDU_TIMEOUT') {
              timedOutCount += 1;
              throw new BridgeHandlerError(err.code, err.message, auditDetails(commandIndex));
            }
            throw err;
          }

          acceptedCount += 1;
          apduResponses.push(toHex(responseBytes));
        }
        this.pushProgress('apdu_complete', 90);
      }

      return {
        connected: true,
        tagId: tag?.id ?? null,
        techType: nfcTech,
        apduResponses,
      };
    } catch (err) {
      if (err instanceof BridgeHandlerError) {
        this.pushProgress('error', 0);
        throw err;
      }
      this.pushProgress('error', 0);
      throw new BridgeHandlerError(
        'NFC_SCAN_FAILED',
        'NFC scan failed',
      );
    } finally {
      this.scanning = false;
      try {
        await manager.cancelTechnologyRequest();
      } catch {
        // cleanup best-effort
      }
    }
  }

  private async cancelScan(): Promise<unknown> {
    const { manager } = this.nfc!;

    this.scanning = false;
    try {
      await manager.cancelTechnologyRequest();
    } catch {
      // already cancelled or no active session
    }
    return { cancelled: true };
  }

  private pushProgress(step: string, percent: number): void {
    this.router.pushEvent('nfc', 'scanProgress', { step, percent });
  }
}
