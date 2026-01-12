// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

declare module 'react-native-passport-reader' {
  interface ScanOptions {
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
    canNumber: string;
    useCan: boolean;
    quality?: number;
    sessionId?: string;
    skipReselect?: boolean;
  }

  interface PassportReader {
    configure?(token: string, enableDebug?: boolean): void;
    trackEvent?(name: string, properties?: Record<string, unknown>): void;
    flush?(): void;
    reset(): void;
    scanPassport(
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
    ): Promise<{
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
    }>;
  }

  export const PassportReader: PassportReader;
  export function configure(token: string): void;
  export function reset(): void;
  export function scan(options: ScanOptions): Promise<{
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
  }>;
}
