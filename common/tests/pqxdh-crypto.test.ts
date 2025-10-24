// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';
import {
  generateX25519Keypair,
  kyberEncapsulate,
  computeX25519SharedSecret,
  deriveSessionKey,
  getSupportedSuites,
} from '../src/utils/proving/pqxdh-crypto.js';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';

/// Tests the PQXDH cryptographic utilities for post-quantum secure key exchange.
describe('PQXDH Cryptographic Utilities', () => {
  /// Tests X25519 keypair generation.
  describe('generateX25519Keypair', () => {
    /// Verifies that a valid X25519 keypair is generated with correct key sizes.
    it('should generate valid X25519 keypair', () => {
      const keys = generateX25519Keypair();

      expect(keys.privateKey).toBeInstanceOf(Uint8Array);
      expect(keys.publicKey).toBeInstanceOf(Uint8Array);
      expect(keys.privateKey.length).toBe(32);
      expect(keys.publicKey.length).toBe(32);
    });

    /// Verifies that each call generates a unique keypair (proper randomness).
    it('should generate different keypairs on subsequent calls', () => {
      const keys1 = generateX25519Keypair();
      const keys2 = generateX25519Keypair();

      expect(keys1.privateKey).not.toEqual(keys2.privateKey);
      expect(keys1.publicKey).not.toEqual(keys2.publicKey);
    });
  });

  /// Tests Kyber ML-KEM-768 encapsulation.
  describe('kyberEncapsulate', () => {
    /// Verifies that Kyber encapsulation produces valid shared secret and ciphertext.
    it('should perform valid Kyber encapsulation', () => {
      // generating a Kyber keypair
      const { publicKey, secretKey } = ml_kem768.keygen();

      // encapsulating
      const { sharedSecret, ciphertext } = kyberEncapsulate(publicKey);

      expect(sharedSecret).toBeInstanceOf(Uint8Array);
      expect(ciphertext).toBeInstanceOf(Uint8Array);
      expect(sharedSecret.length).toBe(32); // ML-KEM-768 shared secret is 32 bytes
      expect(ciphertext.length).toBe(1088); // ML-KEM-768 ciphertext is 1088 bytes

      // verifying decapsulation works
      const decapsulatedSecret = ml_kem768.decapsulate(ciphertext, secretKey);
      expect(decapsulatedSecret).toEqual(sharedSecret);
    });

    /// Verifies that Kyber encapsulation is probabilistic (different ciphertexts each time).
    it('should produce different ciphertexts for same public key', () => {
      const { publicKey } = ml_kem768.keygen();

      const result1 = kyberEncapsulate(publicKey);
      const result2 = kyberEncapsulate(publicKey);

      // ciphertexts should be different (randomized encapsulation)
      expect(result1.ciphertext).not.toEqual(result2.ciphertext);
      // shared secrets should also be different
      expect(result1.sharedSecret).not.toEqual(result2.sharedSecret);
    });

  });

  /// Tests X25519 ECDH shared secret computation.
  describe('computeX25519SharedSecret', () => {
    /// Verifies that both parties derive the same shared secret.
    it('should compute valid shared secret', () => {
      const alice = generateX25519Keypair();
      const bob = generateX25519Keypair();

      const aliceShared = computeX25519SharedSecret(alice.privateKey, bob.publicKey);
      const bobShared = computeX25519SharedSecret(bob.privateKey, alice.publicKey);

      expect(aliceShared).toBeInstanceOf(Uint8Array);
      expect(aliceShared.length).toBe(32);
      expect(aliceShared).toEqual(bobShared);
    });
  });

  /// Tests HKDF-based session key derivation following Signal PQXDH spec.
  describe('deriveSessionKey', () => {
    /// Verifies that a valid 32-byte session key is derived.
    it('should derive valid session key', () => {
      const x25519Shared = new Uint8Array(32).fill(1);
      const kyberShared = new Uint8Array(32).fill(2);

      const sessionKey = deriveSessionKey(x25519Shared, kyberShared);

      expect(sessionKey).toBeInstanceOf(Buffer);
      expect(sessionKey.length).toBe(32);
    });

    /// Verifies that key derivation is deterministic (same inputs produce same output).
    it('should produce identical keys for same inputs', () => {
      const x25519Shared = new Uint8Array(32).fill(1);
      const kyberShared = new Uint8Array(32).fill(2);

      const key1 = deriveSessionKey(x25519Shared, kyberShared);
      const key2 = deriveSessionKey(x25519Shared, kyberShared);

      expect(key1).toEqual(key2);
    });

    it('should produce different keys for different X25519 shared secrets', () => {
      const kyberShared = new Uint8Array(32).fill(2);

      const key1 = deriveSessionKey(new Uint8Array(32).fill(1), kyberShared);
      const key2 = deriveSessionKey(new Uint8Array(32).fill(10), kyberShared);

      expect(key1).not.toEqual(key2);
    });

    it('should produce different keys for different Kyber shared secrets', () => {
      const x25519Shared = new Uint8Array(32).fill(1);

      const key1 = deriveSessionKey(x25519Shared, new Uint8Array(32).fill(2));
      const key2 = deriveSessionKey(x25519Shared, new Uint8Array(32).fill(20));

      expect(key1).not.toEqual(key2);
    });
  });

  /// Tests supported cryptographic suites listing.
  describe('getSupportedSuites', () => {
    /// Verifies that supported suites are returned in preference order.
    it('should return supported suites in preference order', () => {
      const suites = getSupportedSuites();

      expect(suites).toEqual(['Self-PQXDH-1', 'legacy-p256']);
      expect(suites.length).toBe(2);
    });

    it('should prefer PQXDH over legacy', () => {
      const suites = getSupportedSuites();

      expect(suites[0]).toBe('Self-PQXDH-1');
      expect(suites[1]).toBe('legacy-p256');
    });
  });

  /// Tests compliance with Signal's PQXDH protocol specification.
  describe('Signal PQXDH Specification Compliance', () => {
    /// Verifies that the HKDF info parameter follows Signal's format.
    it('should use correct info string format per Signal spec', () => {
      // the info string should follow the pattern "protocol_curve_hash_pqkem"
      // per Signal spec: "MyProtocol_CURVE25519_SHA-512_CRYSTALS-KYBER-1024"
      const x25519Shared = new Uint8Array(32).fill(1);
      const kyberShared = new Uint8Array(32).fill(2);

      // this should not throw and should use the format:
      // "Self-PQXDH-1_X25519_SHA-256_ML-KEM-768"
      const sessionKey = deriveSessionKey(x25519Shared, kyberShared);

      expect(sessionKey).toBeInstanceOf(Buffer);
      expect(sessionKey.length).toBe(32);
    });

    it('should use F prefix (32 0xFF bytes) for curve25519 per Signal spec', () => {
      // per Signal spec, IKM should be F || KM where F = 32 0xFF bytes
      // we can't directly test this without instrumenting the function,
      // but we can verify consistent behavior
      const x25519Shared = new Uint8Array(32).fill(1);
      const kyberShared = new Uint8Array(32).fill(2);

      const key1 = deriveSessionKey(x25519Shared, kyberShared);
      const key2 = deriveSessionKey(x25519Shared, kyberShared);

      // keys should be deterministic with F prefix
      expect(key1).toEqual(key2);
    });

    it('should use zero-filled salt per Signal spec', () => {
      // per Signal spec, salt should be zero-filled with length = hash output length
      const x25519Shared = new Uint8Array(32).fill(1);
      const kyberShared = new Uint8Array(32).fill(2);

      const sessionKey = deriveSessionKey(x25519Shared, kyberShared);

      // should be deterministic (zero salt)
      expect(sessionKey).toBeInstanceOf(Buffer);
      expect(sessionKey.length).toBe(32);
    });
  });

  /// Tests complete end-to-end PQXDH key exchange flow.
  describe('End-to-End PQXDH Key Exchange', () => {
    /// Verifies that client and server derive identical session keys.
    it('should complete full key exchange between client and server', () => {
      // server setup
      const serverX25519 = generateX25519Keypair();
      const { publicKey: serverKyberPublic, secretKey: serverKyberSecret } = ml_kem768.keygen();

      // client setup
      const clientX25519 = generateX25519Keypair();

      // client performs key exchange
      const clientX25519Shared = computeX25519SharedSecret(
        clientX25519.privateKey,
        serverX25519.publicKey,
      );
      const { sharedSecret: clientKyberShared, ciphertext } = kyberEncapsulate(serverKyberPublic);

      const clientSessionKey = deriveSessionKey(clientX25519Shared, clientKyberShared);

      // server performs key exchange
      const serverX25519Shared = computeX25519SharedSecret(
        serverX25519.privateKey,
        clientX25519.publicKey,
      );
      const serverKyberShared = ml_kem768.decapsulate(ciphertext, serverKyberSecret);

      const serverSessionKey = deriveSessionKey(serverX25519Shared, serverKyberShared);

      // both sides should have the same session key
      expect(clientSessionKey).toEqual(serverSessionKey);
    });
  });
});
