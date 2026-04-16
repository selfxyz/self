export const PASSPORT_ATTESTATION_ID = '1';
export const ID_CARD_ATTESTATION_ID = '2';
export const AADHAAR_ATTESTATION_ID = '3';
export const KYC_ATTESTATION_ID = '4';

export enum RegisterVerifierId {
  register_sha256_sha256_sha256_rsa_65537_4096 = 0,
  register_sha256_sha256_sha256_ecdsa_brainpoolP384r1 = 1,
  register_sha256_sha256_sha256_ecdsa_secp256r1 = 2,
  register_sha256_sha256_sha256_ecdsa_secp384r1 = 3,
  register_sha256_sha256_sha256_rsa_3_4096 = 4,
  register_sha256_sha256_sha256_rsapss_3_32_2048 = 5,
  register_sha256_sha256_sha256_rsapss_65537_32_2048 = 6,
  register_sha256_sha256_sha256_rsapss_65537_32_3072 = 7,
  register_sha384_sha384_sha384_ecdsa_brainpoolP384r1 = 8,
  register_sha384_sha384_sha384_ecdsa_brainpoolP512r1 = 9,
  register_sha384_sha384_sha384_ecdsa_secp384r1 = 10,
  register_sha512_sha512_sha512_ecdsa_brainpoolP512r1 = 11,
  register_sha512_sha512_sha512_rsa_65537_4096 = 12,
  register_sha512_sha512_sha512_rsapss_65537_64_2048 = 13,
  register_sha1_sha1_sha1_rsa_65537_4096 = 14,
  register_sha1_sha256_sha256_rsa_65537_4096 = 15,
  register_sha224_sha224_sha224_ecdsa_brainpoolP224r1 = 16,
  register_sha256_sha224_sha224_ecdsa_secp224r1 = 17,
  register_sha256_sha256_sha256_ecdsa_brainpoolP256r1 = 18,
  register_sha1_sha1_sha1_ecdsa_brainpoolP224r1 = 19,
  register_sha384_sha384_sha384_rsapss_65537_48_2048 = 20,
  register_sha1_sha1_sha1_ecdsa_secp256r1 = 21,
  register_sha256_sha256_sha256_rsapss_65537_64_2048 = 22,
  register_sha512_sha512_sha256_rsa_65537_4096 = 23,
  register_sha512_sha512_sha512_ecdsa_secp521r1 = 24,
  register_id_sha256_sha256_sha256_rsa_65537_4096 = 25,
  register_sha256_sha256_sha224_ecdsa_secp224r1 = 26,
  register_id_sha1_sha1_sha1_ecdsa_brainpoolP224r1 = 27,
  register_id_sha1_sha1_sha1_ecdsa_secp256r1 = 28,
  register_id_sha1_sha1_sha1_rsa_65537_4096 = 29,
  register_id_sha1_sha256_sha256_rsa_65537_4096 = 30,
  register_id_sha224_sha224_sha224_ecdsa_brainpoolP224r1 = 31,
  register_id_sha256_sha224_sha224_ecdsa_secp224r1 = 32,
  register_id_sha256_sha256_sha224_ecdsa_secp224r1 = 33,
  register_id_sha256_sha256_sha256_ecdsa_brainpoolP256r1 = 34,
  register_id_sha256_sha256_sha256_ecdsa_brainpoolP384r1 = 35,
  register_id_sha256_sha256_sha256_ecdsa_secp256r1 = 36,
  register_id_sha256_sha256_sha256_ecdsa_secp384r1 = 37,
  register_id_sha256_sha256_sha256_rsa_3_4096 = 38,
  register_id_sha256_sha256_sha256_rsapss_3_32_2048 = 39,
  register_id_sha256_sha256_sha256_rsapss_65537_32_2048 = 40,
  register_id_sha256_sha256_sha256_rsapss_65537_32_3072 = 41,
  register_id_sha256_sha256_sha256_rsapss_65537_64_2048 = 42,
  register_id_sha384_sha384_sha384_ecdsa_brainpoolP384r1 = 43,
  register_id_sha384_sha384_sha384_ecdsa_brainpoolP512r1 = 44,
  register_id_sha384_sha384_sha384_ecdsa_secp384r1 = 45,
  register_id_sha384_sha384_sha384_rsapss_65537_48_2048 = 46,
  register_id_sha512_sha512_sha256_rsa_65537_4096 = 47,
  register_id_sha512_sha512_sha512_ecdsa_brainpoolP512r1 = 48,
  register_id_sha512_sha512_sha512_ecdsa_secp521r1 = 49,
  register_id_sha512_sha512_sha512_rsa_65537_4096 = 50,
  register_id_sha512_sha512_sha512_rsapss_65537_64_2048 = 51,
}

export enum DscVerifierId {
  dsc_sha1_ecdsa_brainpoolP256r1 = 0,
  dsc_sha1_rsa_65537_4096 = 1,
  dsc_sha256_ecdsa_brainpoolP256r1 = 2,
  dsc_sha256_ecdsa_brainpoolP384r1 = 3,
  dsc_sha256_ecdsa_secp256r1 = 4,
  dsc_sha256_ecdsa_secp384r1 = 5,
  dsc_sha256_ecdsa_secp521r1 = 6,
  dsc_sha256_rsa_65537_4096 = 7,
  dsc_sha256_rsapss_3_32_3072 = 8,
  dsc_sha256_rsapss_65537_32_3072 = 9,
  dsc_sha256_rsapss_65537_32_4096 = 10,
  dsc_sha384_ecdsa_brainpoolP384r1 = 11,
  dsc_sha384_ecdsa_brainpoolP512r1 = 12,
  dsc_sha384_ecdsa_secp384r1 = 13,
  dsc_sha512_ecdsa_brainpoolP512r1 = 14,
  dsc_sha512_ecdsa_secp521r1 = 15,
  dsc_sha512_rsa_65537_4096 = 16,
  dsc_sha512_rsapss_65537_64_4096 = 17,
  dsc_sha256_rsapss_3_32_4096 = 18,
  dsc_sha1_ecdsa_secp256r1 = 19,
}

export enum SignatureAlgorithmIndex {
  rsa_sha256_65537_2048 = 1,
  rsa_sha1_65537_2048 = 3,
  rsapss_sha256_65537_2048 = 4,
  ecdsa_sha1_secp256r1_256 = 7,
  ecdsa_sha256_secp256r1_256 = 8,
  ecdsa_sha384_secp384r1_384 = 9,
  rsa_sha256_65537_4096 = 10,
  rsa_sha1_65537_4096 = 11,
  rsapss_sha256_65537_4096 = 12,
  rsa_sha256_3_2048 = 13,
  rsa_sha256_65537_3072 = 14,
  rsa_sha512_65537_4096 = 15,
  rsapss_sha256_3_3072 = 16,
  rsapss_sha256_3_4096 = 17,
  rsapss_sha384_65537_3072 = 18,
  rsapss_sha256_65537_3072 = 19,
  ecdsa_sha256_brainpoolP256r1_256 = 21,
  ecdsa_sha384_brainpoolP384r1_384 = 22,
  ecdsa_sha256_secp384r1_384 = 23,
  ecdsa_sha384_brainpoolP256r1_256 = 24,
  ecdsa_sha512_brainpoolP256r1_256 = 25,
  ecdsa_sha512_brainpoolP384r1_384 = 26,
  ecdsa_sha1_brainpoolP224r1_224 = 27,
  ecdsa_sha256_brainpoolP224r1_224 = 28,
  ecdsa_sha512_brainpoolP512r1_512 = 29,
  ecdsa_sha224_brainpoolP224r1_224 = 30,
  rsa_sha256_3_4096 = 32,
  rsa_sha1_3_4096 = 33,
  rsa_sha384_65537_4096 = 34,
  rsapss_sha384_65537_4096 = 35,
  ecdsa_sha1_brainpoolP256r1_256 = 36,
  ecdsa_sha512_secp521r1_521 = 41,
  rsa_sha1_64321_4096 = 47,
}

export const IDENTITY_VERIFICATION_HUB_ADDRESS = '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';

export const IDENTITY_VERIFICATION_HUB_ADDRESS_STAGING =
  '0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74';

export const PCR0_MANAGER_ADDRESS = '0xE36d4EE5Fd3916e703A46C21Bb3837dB7680C8B8';

export const REGISTER_CONTRACT_ADDRESS = '0x3F346FFdC5d583e4126AF01A02Ac5b9CdB3f1909';

export const SBT_CONTRACT_ADDRESS = '0x601Fd54FD11C5E77DE84d877e55B829aff20f0A6';

export const CHAIN_NAME = 'celo';

export const DEVELOPMENT_MODE = true;
