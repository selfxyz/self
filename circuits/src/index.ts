// Main circuits package runtime API
// This package provides circuit definitions and related utilities

// Circuit metadata and constants
export const CIRCUITS_VERSION = '0.0.1';

// Supported signature algorithms
export const SUPPORTED_SIGNATURE_ALGORITHMS = [
  'rsa_sha256_65537_2048',
  'rsa_sha256_65537_3072',
  'rsa_sha256_65537_4096',
  'rsa_sha1_65537_2048',
  'rsa_sha512_65537_4096',
  'rsapss_sha256_65537_32_3072',
  'rsapss_sha256_65537_32_4096',
  'rsapss_sha256_3_32_3072',
  'rsapss_sha384_65537_48_3072',
  'rsapss_sha512_65537_64_4096',
] as const;

export type SupportedSignatureAlgorithm = (typeof SUPPORTED_SIGNATURE_ALGORITHMS)[number];

// Note: Test utilities have been moved to a dedicated './testing' export
// Import test utilities via: import { ... } from '@selfxyz/circuits/testing'
