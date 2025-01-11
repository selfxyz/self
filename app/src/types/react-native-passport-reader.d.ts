declare module 'react-native-passport-reader' {
  interface ScanOptions {
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
    quality?: number;
  }

  interface PassportReader {
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
