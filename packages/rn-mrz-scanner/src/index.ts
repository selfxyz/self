// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { NativeModules } from 'react-native';

/**
 * Result shape returned by {@link SelfMRZScannerModule.startScanning}. Mirrors the
 * contract consumed by `@selfxyz/rn-sdk`'s `CameraHandler` (documentNumber, dateOfBirth,
 * dateOfExpiry drive the NFC BAC key; documentType/countryCode are best-effort). Dates are
 * ICAO 9303 `YYMMDD` strings; fields other than these five are not part of the contract.
 */
export interface MrzScanResult {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  documentType?: string;
  countryCode?: string;
}

/**
 * Native module surface. Rejections carry a `code` that `CameraHandler` maps:
 * `CAMERA_PERMISSION_DENIED`, `CAMERA_INIT_FAILED`, `MRZ_SCAN_CANCELLED`.
 */
export interface SelfMRZScannerModule {
  startScanning(): Promise<MrzScanResult>;
}

/**
 * Resolve the native module without throwing at import time — the JS entry is safe to import
 * even when the native side is not linked (KYC-only installs). Returns `null` when absent so
 * callers can treat the scanner as unavailable.
 */
export function getMrzScannerModule(): SelfMRZScannerModule | null {
  const modules = (NativeModules ?? {}) as Record<string, unknown>;
  const scanner = modules.SelfMRZScannerModule as SelfMRZScannerModule | undefined;
  return scanner && typeof scanner.startScanning === 'function' ? scanner : null;
}

/** True when the native `SelfMRZScannerModule` is linked and callable. */
export function isMrzScannerAvailable(): boolean {
  return getMrzScannerModule() !== null;
}
