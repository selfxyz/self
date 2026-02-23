// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';
import { NativeModules } from 'react-native';

interface MrzScannerModule {
  startScanning: () => Promise<unknown>;
}

interface MrzScanData {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  documentType?: string;
  countryCode?: string;
}

function loadMrzScannerModule(): MrzScannerModule | null {
  const nativeModules = NativeModules as Record<string, unknown>;
  const scanner =
    (nativeModules.SelfMRZScannerModule as MrzScannerModule | undefined) ??
    (nativeModules.MRZScannerModule as MrzScannerModule | undefined);
  return scanner ?? null;
}

function normalizeMrzScanResult(result: unknown): MrzScanData {
  const root = (result ?? {}) as Record<string, unknown>;
  const payload = (root.data ?? root) as Record<string, unknown>;

  const documentNumber =
    typeof payload.documentNumber === 'string'
      ? payload.documentNumber
      : typeof payload.passportNumber === 'string'
        ? payload.passportNumber
        : '';
  const dateOfBirth =
    typeof payload.dateOfBirth === 'string'
      ? payload.dateOfBirth
      : typeof payload.birthDate === 'string'
        ? payload.birthDate
        : '';
  const dateOfExpiry =
    typeof payload.dateOfExpiry === 'string'
      ? payload.dateOfExpiry
      : typeof payload.expiryDate === 'string'
        ? payload.expiryDate
        : '';
  const documentType = typeof payload.documentType === 'string' ? payload.documentType : undefined;
  const countryCode = typeof payload.countryCode === 'string' ? payload.countryCode : undefined;

  if (!documentNumber || !dateOfBirth || !dateOfExpiry) {
    throw new BridgeHandlerError(
      'MRZ_SCAN_INVALID_RESULT',
      'MRZ scan returned incomplete data',
    );
  }

  return {
    documentNumber,
    dateOfBirth,
    dateOfExpiry,
    documentType,
    countryCode,
  };
}

export class CameraHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'camera';

  async handle(method: string, _params: Record<string, unknown>): Promise<unknown> {
    const scanner = loadMrzScannerModule();

    switch (method) {
      case 'isAvailable':
        return scanner !== null;
      case 'scanMRZ':
        if (!scanner || typeof scanner.startScanning !== 'function') {
          throw new BridgeHandlerError(
            'NOT_AVAILABLE',
            'MRZ scanner module is not installed',
          );
        }

        try {
          const result = await scanner.startScanning();
          return normalizeMrzScanResult(result);
        } catch (err) {
          if (err instanceof BridgeHandlerError) {
            throw err;
          }
          throw new BridgeHandlerError(
            'MRZ_SCAN_FAILED',
            err instanceof Error ? err.message : 'MRZ scan failed',
          );
        }
      default:
        throw new BridgeHandlerError('METHOD_NOT_FOUND', `Unknown camera method: ${method}`);
    }
  }
}
