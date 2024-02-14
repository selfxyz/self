export type DataHash = [number, number[]];

export type PassportData = {
  mrz: string;
  signatureAlgorithm: string;
  pubKey: {modulus?: string, curveName?: string, publicKeyQ?: string};
  dataGroupHashes: DataHash[] | number[];
  eContent: number[];
  encryptedDigest: number[];
  photo: {
    base64: string;
    height: number;
    width: number;
  }
};
