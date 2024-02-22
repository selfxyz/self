export type PassportData = {
  mrz: string;
  signatureAlgorithm: string;
  pubKey: {modulus?: string, exponent?: string, curveName?: string, publicKeyQ?: string};
  dataGroupHashes: number[];
  eContent: number[];
  encryptedDigest: number[];
  photoBase64: string;
};
