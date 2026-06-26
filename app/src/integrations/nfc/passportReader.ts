// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { NativeModules, Platform } from 'react-native';

type ScanOptions = {
  documentNumber: string;
  dateOfBirth: string; // YYMMDD
  dateOfExpiry: string; // YYMMDD
  canNumber?: string;
  useCan?: boolean;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  usePacePolling?: boolean;
  sessionId?: string;
  quality?: number;
  skipReselect?: boolean;
};

export interface AndroidScanResponse {
  mrz: string;
  eContent: string;
  encryptedDigest: string;
  photo: {
    base64: string;
  };
  digestAlgorithm: string;
  signerInfoDigestAlgorithm: string;
  digestEncryptionAlgorithm: string;
  LDSVersion: string;
  unicodeVersion: string;
  encapContent: string;
  documentSigningCertificate: string;
  dataGroupHashes: string;
}

export type FixtureTapeStatus = 'success' | 'failed' | 'unknown';

export interface FixtureTapeSummary {
  name: string;
  sizeBytes: number;
  issuingCountry: string | null;
  status: FixtureTapeStatus;
}

export interface NfcDebugBridgeOptions {
  relayUrl: string;
  documentNumber: string;
  dateOfBirth: string; // YYMMDD
  dateOfExpiry: string; // YYMMDD
  canNumber?: string;
}

type AndroidPassportReaderModule = {
  configure?: (token: string, enableDebug?: boolean) => void;
  trackEvent?: (name: string, properties?: Record<string, unknown>) => void;
  flush?: () => void | Promise<void>;
  reset?: () => void;
  resetIdentity?: () => void;
  setDistinctId?: (distinctId: string) => void;
  scan?: (options: ScanOptions) => Promise<AndroidScanResponse>;
  // Opt-in APDU fixture capture (Android only; present on newer native builds).
  setFixtureCaptureEnabled?: (enabled: boolean) => Promise<boolean>;
  listFixtureTapes?: () => Promise<FixtureTapeSummary[]>;
  readFixtureTape?: (name: string) => Promise<string | null>;
  deleteFixtureTapes?: () => Promise<void>;
  // Debug-only on-device NFC-debug bridge (Android; present on newer builds).
  startNfcDebugBridge?: (opts: NfcDebugBridgeOptions) => Promise<boolean>;
  stopNfcDebugBridge?: () => Promise<boolean>;
};

type IOSPassportReaderModule = {
  configure?: (token: string, enableDebug?: boolean) => void;
  trackEvent?: (name: string, properties?: Record<string, unknown>) => void;
  flush?: () => void | Promise<void>;
  resetIdentity?: () => void;
  setDistinctId?: (distinctId: string) => void;
  scanPassport?: (
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
  ) => Promise<string | Record<string, unknown>>;
};

type PassportReaderModule =
  | AndroidPassportReaderModule
  | IOSPassportReaderModule;

// Platform-specific PassportReader implementation
let PassportReader: PassportReaderModule | null = null;
let scan: ((options: ScanOptions) => Promise<unknown>) | null = null;
let resetImpl: (() => void) | undefined;
// Retained reference to the Android module so the fixture-capture helpers below
// can reach its bridge methods (which only exist on newer native builds).
let androidModule: AndroidPassportReaderModule | undefined;

if (Platform.OS === 'android') {
  // Android uses the react-native-passport-reader package
  const AndroidPassportReader = NativeModules.RNPassportReader as
    | AndroidPassportReaderModule
    | undefined;

  if (AndroidPassportReader) {
    PassportReader = AndroidPassportReader;
    androidModule = AndroidPassportReader;
    resetImpl = () => AndroidPassportReader.reset?.();
    if (AndroidPassportReader.scan) {
      const androidScan = AndroidPassportReader.scan.bind(
        AndroidPassportReader,
      );
      scan = async options => {
        const {
          documentNumber,
          dateOfBirth,
          dateOfExpiry,
          canNumber = '',
          useCan = false,
          quality = 1,
          skipReselect = false,
          skipPACE = false,
          sessionId,
        } = options;

        return androidScan({
          documentNumber,
          dateOfBirth,
          dateOfExpiry,
          canNumber,
          useCan,
          quality,
          skipReselect,
          skipPACE,
          sessionId,
        });
      };
    }
  } else {
    console.warn('Failed to load Android PassportReader: module not found');
  }
} else if (Platform.OS === 'ios') {
  // iOS uses the native PassportReader module directly
  const IOSPassportReader = NativeModules.PassportReader as
    | IOSPassportReaderModule
    | undefined;

  PassportReader = IOSPassportReader ?? null;

  // iOS uses scanPassport method with different signature
  if (IOSPassportReader?.scanPassport) {
    const scanPassport = IOSPassportReader.scanPassport.bind(IOSPassportReader);
    scan = async options => {
      const {
        documentNumber,
        dateOfBirth,
        dateOfExpiry,
        canNumber = '',
        useCan = false,
        skipPACE = false,
        skipCA = false,
        extendedMode = false,
        usePacePolling = true,
        sessionId = '',
      } = options;

      const result = await scanPassport(
        documentNumber,
        dateOfBirth,
        dateOfExpiry,
        canNumber,
        useCan,
        skipPACE,
        skipCA,
        extendedMode,
        usePacePolling,
        sessionId,
      );
      // iOS native returns a JSON string; normalize to object.
      try {
        return typeof result === 'string' ? JSON.parse(result) : result;
      } catch {
        return result;
      }
    };
  }
} else {
  // Unsupported platform
  console.warn('PassportReader: Unsupported platform');
}

const reset = () => {
  resetImpl?.();
};

/**
 * True when the running native build exposes the opt-in APDU fixture-capture
 * bridge. Android-only; older native builds and iOS return false, so callers
 * can hide/disable the feature instead of crashing.
 */
const isFixtureCaptureSupported =
  Platform.OS === 'android' &&
  typeof androidModule?.setFixtureCaptureEnabled === 'function';

const fixtureCapture = {
  isSupported: isFixtureCaptureSupported,
  setEnabled(enabled: boolean): Promise<boolean> {
    if (!androidModule?.setFixtureCaptureEnabled) {
      return Promise.resolve(false);
    }
    return androidModule.setFixtureCaptureEnabled(enabled);
  },
  listTapes(): Promise<FixtureTapeSummary[]> {
    if (!androidModule?.listFixtureTapes) {
      return Promise.resolve([]);
    }
    return androidModule.listFixtureTapes();
  },
  readTape(name: string): Promise<string | null> {
    if (!androidModule?.readFixtureTape) {
      return Promise.resolve(null);
    }
    return androidModule.readFixtureTape(name);
  },
  deleteTapes(): Promise<void> {
    if (!androidModule?.deleteFixtureTapes) {
      return Promise.resolve();
    }
    return androidModule.deleteFixtureTapes();
  },
};

/**
 * True when the running native build exposes the on-device NFC-debug bridge.
 * Android-only; older builds and iOS return false so the dev screen can hide.
 */
const isNfcDebugBridgeSupported =
  Platform.OS === 'android' &&
  typeof androidModule?.startNfcDebugBridge === 'function';

const nfcDebugBridge = {
  isSupported: isNfcDebugBridgeSupported,
  start(opts: NfcDebugBridgeOptions): Promise<boolean> {
    if (!androidModule?.startNfcDebugBridge) {
      return Promise.reject(new Error('NFC debug bridge unavailable'));
    }
    return androidModule.startNfcDebugBridge(opts);
  },
  stop(): Promise<boolean> {
    if (!androidModule?.stopNfcDebugBridge) {
      return Promise.resolve(false);
    }
    return androidModule.stopNfcDebugBridge();
  },
};

export type { ScanOptions };
export {
  fixtureCapture,
  isFixtureCaptureSupported,
  isNfcDebugBridgeSupported,
  nfcDebugBridge,
  PassportReader,
  reset,
  scan,
};
export default PassportReader;
