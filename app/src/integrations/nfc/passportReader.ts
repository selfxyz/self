// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
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

type AndroidPassportReaderModule = {
  configure?: (token: string, enableDebug?: boolean) => void;
  trackEvent?: (name: string, properties?: Record<string, unknown>) => void;
  flush?: () => void | Promise<void>;
  reset?: () => void;
  scan?: (options: ScanOptions) => Promise<AndroidScanResponse>;
};

type IOSPassportReaderModule = {
  configure?: (token: string, enableDebug?: boolean) => void;
  trackEvent?: (name: string, properties?: Record<string, unknown>) => void;
  flush?: () => void | Promise<void>;
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

if (Platform.OS === 'android') {
  // Android uses the react-native-passport-reader package
  const AndroidPassportReader = NativeModules.RNPassportReader as
    | AndroidPassportReaderModule
    | undefined;

  if (AndroidPassportReader) {
    PassportReader = AndroidPassportReader;
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

export type { ScanOptions };
export { PassportReader, reset, scan };
export default PassportReader;
