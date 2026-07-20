// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { BridgeDomain } from '../bridge/types';
import type { BridgeHandler } from '../bridge/types';
import { BridgeHandlerError } from '../bridge/types';
import { NativeModules } from 'react-native';

interface MrzScannerModule {
  startScanning: (options: Record<string, unknown>) => Promise<unknown>;
  stopScanning?: () => void;
}

interface MrzScanData {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  documentType?: string;
  countryCode?: string;
}

function loadMrzScannerModule(): MrzScannerModule | null {
  try {
    const nativeModules = (NativeModules ?? {}) as Record<string, unknown>;
    const scanner =
      (nativeModules.SelfMRZScannerModule as MrzScannerModule | undefined) ??
      (nativeModules.MRZScannerModule as MrzScannerModule | undefined);
    return scanner ?? null;
  } catch {
    return null;
  }
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

function extractNativeErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('code' in err)) {
    return undefined;
  }

  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export class CameraHandler implements BridgeHandler {
  readonly domain: BridgeDomain = 'camera';

  isAvailable(): boolean {
    const scanner = loadMrzScannerModule();
    return scanner !== null && typeof scanner.startScanning === 'function';
  }

  async handle(method: string, params: Record<string, unknown>): Promise<unknown> {
    const scanner = loadMrzScannerModule();

    switch (method) {
      case 'isAvailable':
        return scanner !== null && typeof scanner.startScanning === 'function';
      case 'stopCamera':
        // Web-driven cancel (e.g. leaving the viewfinder route). No-op when the
        // module or the method is absent; never rejects.
        scanner?.stopScanning?.();
        return null;
      case 'scanMRZ':
        if (!scanner || typeof scanner.startScanning !== 'function') {
          throw new BridgeHandlerError(
            'NOT_AVAILABLE',
            'MRZ scanner module is not installed',
          );
        }

        try {
          // params carries the web viewfinder geometry ({ scanRect: {x,y,width,height} }
          // in physical px); the native module sizes its preview overlay to it.
          const result = await scanner.startScanning(params);
          return normalizeMrzScanResult(result);
        } catch (err) {
          if (err instanceof BridgeHandlerError) {
            throw err;
          }

          const nativeCode = extractNativeErrorCode(err);
          if (nativeCode === 'MRZ_SCAN_CANCELLED') {
            throw new BridgeHandlerError('MRZ_SCAN_CANCELLED', 'MRZ scan cancelled');
          }
          if (nativeCode === 'CAMERA_PERMISSION_DENIED') {
            throw new BridgeHandlerError('CAMERA_PERMISSION_DENIED', 'Camera permission denied');
          }
          if (nativeCode === 'CAMERA_INIT_FAILED') {
            throw new BridgeHandlerError('CAMERA_INIT_FAILED', 'Failed to initialize camera');
          }

          throw new BridgeHandlerError(
            'MRZ_SCAN_FAILED',
            'MRZ scan failed',
          );
        }
      default:
        throw new BridgeHandlerError('METHOD_NOT_FOUND', `Unknown camera method: ${method}`);
    }
  }
}
