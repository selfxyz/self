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
};

// Platform-specific PassportReader implementation
let PassportReader: any;
let reset: any;
let scan: ((options: ScanOptions) => Promise<any>) | null;

if (Platform.OS === 'android') {
  // Android uses the react-native-passport-reader package
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AndroidPassportReader = require('react-native-passport-reader');
    PassportReader = AndroidPassportReader;
    reset = AndroidPassportReader.reset;
    scan = AndroidPassportReader.scan;
  } catch (error) {
    console.warn('Failed to load Android PassportReader:', error);
    PassportReader = null;
    reset = null;
    scan = null;
  }
} else if (Platform.OS === 'ios') {
  // iOS uses the native PassportReader module directly
  PassportReader = NativeModules.PassportReader || null;

  // iOS doesn't have reset function
  reset = null;

  // iOS uses scanPassport method with different signature
  scan = PassportReader?.scanPassport
    ? async (options: ScanOptions) => {
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
        } = options;

        const result = await PassportReader.scanPassport(
          documentNumber,
          dateOfBirth,
          dateOfExpiry,
          canNumber,
          useCan,
          skipPACE,
          skipCA,
          extendedMode,
          usePacePolling,
        );
        // iOS native returns a JSON string; normalize to object.
        try {
          return typeof result === 'string' ? JSON.parse(result) : result;
        } catch {
          return result;
        }
      }
    : null;
} else {
  // Unsupported platform
  console.warn('PassportReader: Unsupported platform');
  PassportReader = null;
  reset = null;
  scan = null;
}

export type { ScanOptions };
export { PassportReader, reset, scan };
export default PassportReader;
