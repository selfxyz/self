// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * `@selfxyz/rn-nfc-passport` provides the native `SelfPassportReader` module that
 * `@selfxyz/rn-sdk`'s `NfcHandler` resolves via `NativeModules.SelfPassportReader`.
 *
 * Autolinking registers the native module; consumers do not normally call this TS
 * surface directly. It exists so the contract is typed and importable even when the
 * package is not linked (e.g. unit tests), where the accessor returns `undefined`.
 */

/** Options accepted by the Android `SelfPassportReader.scan(options)` entry point. */
export interface PassportScanOptions {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  canNumber?: string;
  useCan?: boolean;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  usePacePolling?: boolean;
  sessionId?: string;
  quality?: number;
  skipReselect?: boolean;
}

/**
 * ICAO 9303 chip-read result. The native readers return the document contract the
 * WebView consumes as a JSON string; callers parse it. Kept as `string` to avoid
 * duplicating (and drifting from) the reader's field schema in this shim.
 */
export type PassportScanResult = string;

/**
 * Typed shape of the native `SelfPassportReader` module. The signatures differ per
 * platform to match `NfcHandler`'s resolution logic:
 * - Android: `scan(options)` with the full options object.
 * - iOS: `scanPassport(...)` with the 10-arg positional signature.
 */
export interface SelfPassportReaderNativeModule {
  scan?(options: PassportScanOptions): Promise<PassportScanResult>;
  scanPassport?(
    passportNumber: string,
    dateOfBirth: string,
    dateOfExpiry: string,
    canNumber: string,
    useCan: boolean,
    skipPACE: boolean,
    skipCA: boolean,
    extendedMode: boolean,
    usePacePolling: boolean,
    sessionId: string,
  ): Promise<PassportScanResult>;
  cancelScan?(): Promise<void>;
}

export const SELF_PASSPORT_READER_MODULE_NAME = 'SelfPassportReader';

/**
 * Resolves the `SelfPassportReader` entry from a `NativeModules`-shaped record,
 * returning `undefined` when it is absent. Pure and platform-agnostic so the
 * resolution contract can be unit-tested without a React Native runtime.
 */
export function resolveSelfPassportReader(
  nativeModules: Record<string, unknown> | undefined,
): SelfPassportReaderNativeModule | undefined {
  const mod = nativeModules?.[SELF_PASSPORT_READER_MODULE_NAME];
  return (mod as SelfPassportReaderNativeModule | undefined) ?? undefined;
}

/** Whether a resolved module exposes a usable scan entry point. */
export function isPassportReaderUsable(
  mod: SelfPassportReaderNativeModule | undefined,
): boolean {
  return (
    !!mod &&
    (typeof mod.scan === 'function' || typeof mod.scanPassport === 'function')
  );
}

/**
 * Returns the linked native module, or `undefined` when the package is not linked
 * (unit-test environment, or an app that has not installed this optional peer). Safe
 * to import and call regardless of environment.
 */
export function getSelfPassportReader(): SelfPassportReaderNativeModule | undefined {
  try {
    // Lazy require keeps this module importable outside a React Native runtime.
    const { NativeModules } = require('react-native') as {
      NativeModules?: Record<string, unknown>;
    };
    return resolveSelfPassportReader(NativeModules);
  } catch {
    return undefined;
  }
}

/** Whether the native `SelfPassportReader` module is present and usable. */
export function isSelfPassportReaderAvailable(): boolean {
  return isPassportReaderUsable(getSelfPassportReader());
}
