//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

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
