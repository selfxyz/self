export type PassportData = {
  mrz: string;
  signatureAlgorithm: string;
  pubKey: {modulus?: string, curveName?: string, publicKeyQ?: string};
  dataGroupHashes: number[];
  eContent: number[];
  encryptedDigest: number[];
  photoBase64: string;
};
