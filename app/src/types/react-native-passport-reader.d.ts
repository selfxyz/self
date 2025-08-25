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
  }

  interface PassportReader {
    configure(token: string): void;
    reset(): void;
    scan(options: ScanOptions): Promise<{
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

  const PassportReader: PassportReader;
  export default PassportReader;
}
