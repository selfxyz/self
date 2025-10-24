// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

import { randomBytes } from '@noble/hashes/utils';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { x25519 } from '@noble/curves/ed25519.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import type { X25519Keypair } from './pqxdh-types.js';

/// Generates a fresh X25519 keypair for PQXDH.
export function generateX25519Keypair(): X25519Keypair {
  // generating 32 random bytes for the private key
  const privateKey = randomBytes(32);

  // deriving the public key from the private key using X25519
  const publicKey = x25519.getPublicKey(privateKey);

  return {
    privateKey,
    publicKey,
  };
}

/// Performs Kyber ML-KEM-768 encapsulation to derive a shared secret.
/// @param kyberPublicKey: TEE's Kyber public key (ML-KEM-768, 1184 bytes)
/// @returns Object containing shared secret and ciphertext
export function kyberEncapsulate(kyberPublicKey: Uint8Array): {
  sharedSecret: Uint8Array;
  ciphertext: Uint8Array;
} {

  // encapsulating with the server's Kyber public key to get shared secret and ciphertext
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(kyberPublicKey);

  return {
    sharedSecret,
    ciphertext: cipherText,
  };
}

/// Computes X25519 ECDH shared secret between client and server.
/// @param privateKey: Client's X25519 private key (32 bytes)
/// @param serverPublicKey: TEE's X25519 public key (32 bytes)
/// @returns Shared secret (32 bytes)
export function computeX25519SharedSecret(privateKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  // computing the X25519 shared secret using ECDH
  return x25519.getSharedSecret(privateKey, serverPublicKey);
}

/// Derives the final session key using HKDF-SHA256 (following Signal PQXDH specification).
/// @param x25519Shared: X25519 shared secret from ECDH (32 bytes)
/// @param kyberShared: Kyber shared secret from KEM (32 bytes)
/// @returns Derived 32-byte session key
export function deriveSessionKey(
  x25519Shared: Uint8Array,
  kyberShared: Uint8Array,
): Buffer {

  // creating F prefix (32 0xFF bytes) per Signal PQXDH spec
  // ensures the IKM is never a valid curve25519 scalar or point encoding
  const F = new Uint8Array(32).fill(0xff);

  // concatenating the two shared secrets (X25519 || Kyber) to form KM
  const KM = new Uint8Array(x25519Shared.length + kyberShared.length);
  KM.set(x25519Shared, 0);
  KM.set(kyberShared, x25519Shared.length);

  // combining F and KM to form the input key material (IKM = F || KM)
  const ikm = new Uint8Array(F.length + KM.length);
  ikm.set(F, 0);
  ikm.set(KM, F.length);

  // using zero-filled salt (32 bytes for SHA-256 output length) per Signal spec
  const salt = new Uint8Array(32).fill(0);

  // encoding the info string following the pattern "protocol_curve_hash_pqkem"
  // per Signal spec: "MyProtocol_CURVE25519_SHA-512_CRYSTALS-KYBER-1024"
  const info = new TextEncoder().encode('Self-PQXDH-1_X25519_SHA-256_ML-KEM-768');

  // deriving the final 32-byte session key using HKDF-SHA256
  const sessionKey = hkdf(sha256, ikm, salt, info, 32);

  return Buffer.from(sessionKey);
}

/// Returns supported cryptographic suites in preference order (PQXDH first, then legacy P-256).
export function getSupportedSuites(): ('Self-PQXDH-1' | 'legacy-p256')[] {
  return ['Self-PQXDH-1', 'legacy-p256'];
}

/// ML-KEM-768 (Kyber) implementation for testing and advanced usage.
export { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
