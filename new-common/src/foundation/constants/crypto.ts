import { SignatureAlgorithmIndex } from './identity.js';

export const hashAlgos = ['sha512', 'sha384', 'sha256', 'sha224', 'sha1'];

export type hashAlgosTypes = 'sha512' | 'sha384' | 'sha256' | 'sha224' | 'sha1';

export const saltLengths = [64, 48, 32];

export const ECDSA_K_LENGTH_FACTOR = 2;

export const k_csca = 35;
export const k_dsc = 35;
export const k_dsc_3072 = 35;
export const k_dsc_4096 = 35;
export const k_dsc_ecdsa = 4;

export const n_csca = 120;
export const n_dsc = 120;
export const n_dsc_3072 = 120;
export const n_dsc_4096 = 120;
export const n_dsc_ecdsa = 64;

export const max_csca_bytes = 1792;
export const max_dsc_bytes = 1792;

export const MAX_BYTES_IN_FIELD = 31;

export const MAX_CERT_BYTES: Partial<Record<keyof typeof SignatureAlgorithmIndex, number>> = {
  rsa_sha256_65537_4096: 512,
  rsa_sha1_65537_4096: 640,
  rsa_sha1_64321_4096: 640,
  rsapss_sha256_65537_2048: 640,
  rsapss_sha256_65537_3072: 640,
  rsapss_sha256_65537_4096: 768,
  rsapss_sha256_3_3072: 768,
  rsapss_sha256_3_4096: 768,
  rsapss_sha384_65537_3072: 768,
};

export const MAX_DATAHASHES_LEN = 320;

export const MAX_PADDED_ECONTENT_LEN: Partial<Record<(typeof hashAlgos)[number], number>> = {
  sha1: 384,
  sha224: 512,
  sha256: 512,
  sha384: 768,
  sha512: 896,
};

export const MAX_PADDED_SIGNED_ATTR_LEN: Record<(typeof hashAlgos)[number], number> = {
  sha1: 128,
  sha224: 128,
  sha256: 256,
  sha384: 256,
  sha512: 256,
};

export const MAX_PADDED_SIGNED_ATTR_LEN_FOR_TESTS: Record<(typeof hashAlgos)[number], number> = {
  sha1: 128,
  sha224: 128,
  sha256: 256,
  sha384: 256,
  sha512: 256,
};

export const MAX_PUBKEY_DSC_BYTES = 525;

export const contribute_publicKey = `-----BEGIN RSA PUBLIC KEY-----
MIICCgKCAgEAv/hm7FZZ2KBmaeDHmLoRwuWmCcNKT561RqbsW8ZuYSyPWJUldE9U
Cf0lW3K1H5lsSDkl0Cq84cooL9f6X59Mffb/N24ZKTdL0xdcPwjk4LbcrVm8qubL
0a/4uCNoZZ1my4nxbpLxYtbr8CNmUGvBOVKf8IcjsY6VghIZrO63G6BN/G44su1Z
WcHpboGt9SDQK4enCyKxnCD+PbDYlewSA0n3GRajFfZex1bj1EvrS2hTLv8oNH5e
9H+3TUke0uO6Ttl0bZepoMmPlpAXhJByISqC6SLth4WFIH+G1I/xt9AEM7hOfLMl
KQv/3wlLEgEueRryKAHB2tqkaDKVJyw+tOyWj2iWA+nVgQKAxO4hOw01ljyVbcx6
KboXwnamlZPFIx4tjEaZ+ClXCFqvXhE9LDFK11QsYzJZl0aRVfTNqcurhEt7SK0f
qzOBhID0Nxk4k9sW1uT6ocW1xp1SB2WotORssOKIAOLJM8IbPl6n/DkYNcfvyXI7
4BlUrf6M2DgZMYATabIy94AvopHJOyiRfh4NpQPDntWnShiI1em2MmtXiWFCdVFV
6/QfJTKVixJpVfDh386ALXc97EPWDMWIalUwYoV/eRSMnuV8nZ0+Ctp3Qrtk/JYd
+FWhKbtlPeRjmGVr6mVlvDJ7KqtY5/RqqwfWeXhXezGhQqQ/OoQQCRkCAwEAAQ==
-----END RSA PUBLIC KEY-----`;
