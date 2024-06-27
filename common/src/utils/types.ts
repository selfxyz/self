export type PassportData = {
  mrz: string;
  signatureAlgorithm: string;
  dsc?: string;
  pubKey: {modulus?: string, exponent?: string, curveName?: string, publicKeyQ?: string};
  dataGroupHashes: number[];
  eContent: number[];
  encryptedDigest: number[];
  photoBase64: string;
};

export type Proof = {
  proof: {
    a: [string, string],
    b: [[string, string], [string, string]],
    c: [string, string]
  };
  pub_signals: string[];
}