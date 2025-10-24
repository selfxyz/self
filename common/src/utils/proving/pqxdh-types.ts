// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

/// Cryptographic suite identifier (legacy P-256 ECDH or post-quantum PQXDH).
export type CryptoSuite = 'legacy-p256' | 'Self-PQXDH-1';

/// Parameters for the initial hello message with suite negotiation.
export interface HelloParams {
  user_pubkey: number[];
  uuid: string;
  supported_suites: CryptoSuite[];
}

/// TEE's response to hello message with selected suite and public keys.
/// For legacy-p256: attestation contains embedded server P-256 public key.
/// For Self-PQXDH-1: separate X25519 and Kyber public keys are provided.
export interface HelloResponse {
  attestation: number[];
  attestation_hash?: number[];
  selected_suite: CryptoSuite;
  // only present when selected_suite is 'Self-PQXDH-1'
  x25519_pubkey?: number[];
  kyber_pubkey?: number[];
}

/// Parameters for PQXDH key exchange completion message.
export interface KeyExchangeParams {
  uuid: string;
  kyber_ciphertext: number[];
}

/// X25519 keypair for PQXDH key exchange.
export interface X25519Keypair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

/// Derived session key material after key exchange.
export interface SessionKeyMaterial {
  sharedKey: Buffer;
  x25519_shared?: Uint8Array;
  kyber_shared?: Uint8Array;
}
