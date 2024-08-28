export type PassportData = {
  mrz: string;
  signatureAlgorithm: string;
  dsc?: string;
  pubKey: { modulus?: string, exponent?: string, curveName?: string, publicKeyQ?: string };
  dataGroupHashes: number[];
  eContent: number[];
  encryptedDigest: number[];
  photoBase64: string;
  mockUser?: boolean;
};

export type Proof = {
  proof: {
    a: [string, string],
    b: [[string, string], [string, string]],
    c: [string, string]
  };
  pub_signals: string[];
}

export function castCSCAProof(proof: any): Proof {
  return {
    proof: {
      a: proof.proof.pi_a.slice(0, 2),
      b: [proof.proof.pi_b[0].slice(0, 2), proof.proof.pi_b[1].slice(0, 2)],
      c: proof.proof.pi_c.slice(0, 2)
    },
    pub_signals: proof.pub_signals
  }
}

