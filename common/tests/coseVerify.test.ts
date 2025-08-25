import { Buffer } from 'buffer';
import { ec } from 'elliptic';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import cose from '../src/utils/cose.js';

import { decode, encode } from '@stablelib/cbor';

// Set up mocks before importing the module
vi.mock('@stablelib/cbor', () => ({
  decode: vi.fn(),
  encode: vi.fn(),
}));

vi.mock('elliptic', () => ({
  ec: vi.fn(),
}));

describe('cose.sign.verify', () => {
  let mockVerifyFn: any;
  let mockKeyFromPublicFn: any;

  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(decode).mockClear();
    vi.mocked(encode).mockClear();
    vi.mocked(ec).mockClear();

    // Create fresh mock functions for each test
    mockVerifyFn = vi.fn();
    mockKeyFromPublicFn = vi.fn().mockReturnValue({
      verify: mockVerifyFn,
    });

    // Set up the EC constructor mock
    vi.mocked(ec).mockImplementation(function EC(curve: string) {
      // Validate supported curves for edge case testing
      if (!['p256', 'p384'].includes(curve)) {
        throw new Error(`Unsupported curve: ${curve}`);
      }

      this.keyFromPublic = mockKeyFromPublicFn;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Realistic test data with valid cryptographic values
  const validP256Verifier = {
    key: {
      x: '1ccbe91c075fc7f4f033bfa248db8fccd3565de94bbfb12f3c59ff46c271bf83',
      y: 'ce4014c68811f9a21a1fdb2c0e6113e06db7ca93b7404e78dc7ccd5ca89a4ca9',
      curve: 'p256',
    },
  };

  const validP384Verifier = {
    key: {
      x: '1fbac8eebd0cbf35640b39efe0808dd774debff20a2a329e91713baf7d7f3c3e81546d883730bee7e48678f857b02ca0',
      y: 'eb213103bd68ce343365a8a4c3d4555fa385f5330203bdd76ffad1f3affb95751c132007e1b240353cb0a4cf1693bdf9',
      curve: 'p384',
    },
  };

  const malformedVerifier = {
    key: {
      x: 'invalid_hex',
      y: '1ccbe91c075fc7f4f033bfa248db8fccd3565de94bbfb12f3c59ff46c271bf83',
      curve: 'p256',
    },
  };

  const wrongLengthVerifier = {
    key: {
      x: '1ccbe91c075fc7f4f033bfa248db8fccd3565de94bbfb12f3c59ff46c271bf', // Too short
      y: 'ce4014c68811f9a21a1fdb2c0e6113e06db7ca93b7404e78dc7ccd5ca89a4ca9',
      curve: 'p256',
    },
  };

  const unsupportedCurveVerifier = {
    key: {
      x: '1ccbe91c075fc7f4f033bfa248db8fccd3565de94bbfb12f3c59ff46c271bf83',
      y: 'ce4014c68811f9a21a1fdb2c0e6113e06db7ca93b7404e78dc7ccd5ca89a4ca9',
      curve: 'secp256k1', // Unsupported curve
    },
  };

  // Realistic protected header with algorithm identifier
  const protectedHeaderBytes = new Uint8Array([0xa1, 0x01, 0x26]); // {1: -7} for ES256
  const p384ProtectedHeaderBytes = new Uint8Array([0xa1, 0x01, 0x38, 0x22]); // {1: -35} for ES384
  const payload = Buffer.from('test payload data');
  const validSignature = Buffer.from(Array.from({ length: 64 }, (_, i) => i % 256)); // 64 bytes for p256
  const validP384Signature = Buffer.from(Array.from({ length: 96 }, (_, i) => i % 256)); // 96 bytes for p384
  const oddLengthSignature = Buffer.from(Array.from({ length: 63 }, (_, i) => i % 256)); // Invalid odd length

  const validCoseData = Buffer.from([1, 2, 3, 4]); // Sample COSE data

  describe('valid signature verification', () => {
    it('accepts valid p256 signature', async () => {
      const expectedDecoded = [protectedHeaderBytes, {}, payload, validSignature];
      const expectedSigStructure = ['Signature1', protectedHeaderBytes, new Uint8Array(0), payload];
      const encodedSigStructure = new Uint8Array([1, 2, 3]);

      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(encodedSigStructure);
      mockVerifyFn.mockReturnValue(true);

      await cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 });

      // Verify CBOR functions called with correct parameters
      expect(vi.mocked(decode)).toHaveBeenCalledWith(new Uint8Array(validCoseData));
      expect(vi.mocked(encode)).toHaveBeenCalledWith(expectedSigStructure);
    });

    it('accepts valid p384 signature', async () => {
      const expectedDecoded = [p384ProtectedHeaderBytes, {}, payload, validP384Signature];
      const expectedSigStructure = [
        'Signature1',
        p384ProtectedHeaderBytes,
        new Uint8Array(0),
        payload,
      ];
      const encodedSigStructure = new Uint8Array([1, 2, 3]);

      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(encodedSigStructure);
      mockVerifyFn.mockReturnValue(true);

      await cose.sign.verify(validCoseData, validP384Verifier, { defaultType: 35 });

      // Verify CBOR functions called with correct parameters
      expect(vi.mocked(decode)).toHaveBeenCalledWith(new Uint8Array(validCoseData));
      expect(vi.mocked(encode)).toHaveBeenCalledWith(expectedSigStructure);
    });
  });

  describe('invalid signature verification', () => {
    it('rejects invalid signature', async () => {
      const expectedDecoded = [protectedHeaderBytes, {}, payload, validSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(false);

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('AWS root certificate signature verification failed');
    });

    it('handles exceptions during key creation from public key', async () => {
      const expectedDecoded = [protectedHeaderBytes, {}, payload, validSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));

      mockKeyFromPublicFn.mockImplementation(() => {
        throw new Error('Invalid public key format');
      });

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('Invalid public key format');
    });

    it('handles exceptions during signature verification', async () => {
      const expectedDecoded = [protectedHeaderBytes, {}, payload, validSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));

      mockVerifyFn.mockImplementation(() => {
        throw new Error('Signature verification computation failed');
      });

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('Signature verification computation failed');
    });

    it('handles malformed signature r/s components', async () => {
      // Create a signature with invalid r/s split (all zeros in r part)
      const malformedSignature = Buffer.concat([
        Buffer.alloc(32, 0), // All zeros for r component
        Buffer.from(Array.from({ length: 32 }, (_, i) => i % 256)), // Valid s component
      ]);

      const expectedDecoded = [protectedHeaderBytes, {}, payload, malformedSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(false);

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('AWS root certificate signature verification failed');
    });

    it('handles exceptions during elliptic curve initialization', async () => {
      const expectedDecoded = [protectedHeaderBytes, {}, payload, validSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));

      // Use a verifier with an unsupported curve to trigger the EC constructor error
      const invalidCurveVerifier = {
        key: {
          x: '1ccbe91c075fc7f4f033bfa248db8fccd3565de94bbfb12f3c59ff46c271bf83',
          y: 'ce4014c68811f9a21a1fdb2c0e6113e06db7ca93b7404e78dc7ccd5ca89a4ca9',
          curve: 'secp256k1', // This will trigger the "Unsupported curve" error from our mock
        },
      };

      await expect(
        cose.sign.verify(validCoseData, invalidCurveVerifier, {
          defaultType: 18,
        })
      ).rejects.toThrow('Unsupported curve: secp256k1');
    });

    it('handles verification returning unexpected non-boolean values', async () => {
      const expectedDecoded = [protectedHeaderBytes, {}, payload, validSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(undefined);

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('AWS root certificate signature verification failed');
    });

    it('handles corrupted signature data causing buffer operations to fail', async () => {
      // Create a signature that would cause issues during r/s extraction
      const corruptedSignature = Buffer.from([0xff, 0xfe]); // Too short, but even length

      const expectedDecoded = [protectedHeaderBytes, {}, payload, corruptedSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(false);

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('AWS root certificate signature verification failed');
    });

    it('handles CBOR encode failure during signature structure creation', async () => {
      const expectedDecoded = [protectedHeaderBytes, {}, payload, validSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockImplementation(() => {
        throw new Error('CBOR encoding failed');
      });

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('CBOR encoding failed');
    });

    it('handles signature verification with tampered payload', async () => {
      const tamperedPayload = Buffer.from('tampered payload data');
      const expectedDecoded = [
        protectedHeaderBytes,
        {},
        tamperedPayload, // Different from original payload
        validSignature,
      ];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(false);

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('AWS root certificate signature verification failed');
    });

    it('handles verification with corrupted protected header', async () => {
      const corruptedProtectedHeader = new Uint8Array([0x80, 0x81, 0x82]); // Invalid CBOR
      const expectedDecoded = [corruptedProtectedHeader, {}, payload, validSignature];
      vi.mocked(decode).mockReturnValue(expectedDecoded);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(false);

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('AWS root certificate signature verification failed');
    });
  });

  describe('COSE format edge cases', () => {
    it('throws error when decode returns non-array', async () => {
      vi.mocked(decode).mockReturnValue('not an array');

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('Invalid COSE_Sign1 format');
    });

    it('throws error when decode returns array with wrong length', async () => {
      vi.mocked(decode).mockReturnValue([protectedHeaderBytes, {}, payload]); // Missing signature

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('Invalid COSE_Sign1 format');
    });

    it('throws error when decode returns empty array', async () => {
      vi.mocked(decode).mockReturnValue([]);

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('Invalid COSE_Sign1 format');
    });
  });

  describe('signature format edge cases', () => {
    it('throws error for odd-length signature buffer', async () => {
      vi.mocked(decode).mockReturnValue([protectedHeaderBytes, {}, payload, oddLengthSignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));

      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('Invalid signature length');
    });

    it('handles empty signature buffer reaching verification', async () => {
      const emptySignature = Buffer.alloc(0);
      vi.mocked(decode).mockReturnValue([protectedHeaderBytes, {}, payload, emptySignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(false);

      // Empty signature (length 0) passes length check since 0 % 2 === 0
      // but creates empty r/s hex strings that fail verification
      await expect(
        cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 })
      ).rejects.toThrow('AWS root certificate signature verification failed');
    });
  });

  describe('cryptographic key edge cases', () => {
    it('throws error for malformed key coordinates', async () => {
      vi.mocked(decode).mockReturnValue([protectedHeaderBytes, {}, payload, validSignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));

      // Configure keyFromPublic to throw error for malformed coordinates
      mockKeyFromPublicFn.mockImplementation((publicKey: { x: string; y: string }) => {
        if (!/^[0-9a-fA-F]+$/.test(publicKey.x) || !/^[0-9a-fA-F]+$/.test(publicKey.y)) {
          throw new Error('Invalid key coordinates: must be hexadecimal');
        }
        return { verify: mockVerifyFn };
      });

      await expect(
        cose.sign.verify(validCoseData, malformedVerifier, { defaultType: 18 })
      ).rejects.toThrow('Invalid key coordinates: must be hexadecimal');
    });

    it('throws error for wrong coordinate length', async () => {
      vi.mocked(decode).mockReturnValue([protectedHeaderBytes, {}, payload, validSignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));

      // Configure keyFromPublic to throw error for wrong length
      mockKeyFromPublicFn.mockImplementation((publicKey: { x: string; y: string }) => {
        const expectedLength = 64; // p256
        if (publicKey.x.length !== expectedLength || publicKey.y.length !== expectedLength) {
          throw new Error(`Invalid key coordinate length for curve p256`);
        }
        return { verify: mockVerifyFn };
      });

      await expect(
        cose.sign.verify(validCoseData, wrongLengthVerifier, {
          defaultType: 18,
        })
      ).rejects.toThrow('Invalid key coordinate length for curve p256');
    });

    it('throws error for unsupported curve', async () => {
      vi.mocked(decode).mockReturnValue([protectedHeaderBytes, {}, payload, validSignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));

      await expect(
        cose.sign.verify(validCoseData, unsupportedCurveVerifier, {
          defaultType: 18,
        })
      ).rejects.toThrow('Unsupported curve: secp256k1');
    });
  });

  describe('defaultType option behavior', () => {
    it('accepts different defaultType values without affecting verification', async () => {
      vi.mocked(decode).mockReturnValue([protectedHeaderBytes, {}, payload, validSignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(true);

      // Test different defaultType values (currently not used in implementation)
      await cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 });
      await cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 35 });
      await cose.sign.verify(validCoseData, validP256Verifier, { defaultType: -7 });

      // All should succeed without throwing
      expect(vi.mocked(decode)).toHaveBeenCalledTimes(3);
      expect(vi.mocked(encode)).toHaveBeenCalledTimes(3);
      expect(vi.mocked(ec)).toHaveBeenCalledTimes(3);
    });
  });

  describe('protected header edge cases', () => {
    it('handles empty protected header', async () => {
      const emptyProtectedHeader = new Uint8Array([0xa0]); // Empty CBOR map
      vi.mocked(decode).mockReturnValue([emptyProtectedHeader, {}, payload, validSignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(true);

      await cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 });

      // Should succeed without throwing
      expect(vi.mocked(decode)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(encode)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(ec)).toHaveBeenCalledTimes(1);
    });

    it('handles malformed protected header bytes', async () => {
      const malformedProtectedHeader = new Uint8Array([0xff, 0xff]); // Invalid CBOR
      vi.mocked(decode).mockReturnValue([malformedProtectedHeader, {}, payload, validSignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(true);

      // Note: Currently the implementation doesn't validate protected header content
      // This test documents current behavior and prepares for future validation
      await cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 });

      // Should succeed without throwing
      expect(vi.mocked(decode)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(encode)).toHaveBeenCalledTimes(1);
      expect(vi.mocked(ec)).toHaveBeenCalledTimes(1);
    });

    it('handles various protected header structures', async () => {
      const complexProtectedHeader = new Uint8Array([
        0xa2,
        0x01,
        0x26,
        0x04,
        0x42,
        0x31,
        0x32, // {1: -7, 4: "12"}
      ]);
      vi.mocked(decode).mockReturnValue([complexProtectedHeader, {}, payload, validSignature]);
      vi.mocked(encode).mockReturnValue(new Uint8Array([1, 2, 3]));
      mockVerifyFn.mockReturnValue(true);

      await cose.sign.verify(validCoseData, validP256Verifier, { defaultType: 18 });

      // Verify the protected header is passed correctly to the signature structure
      expect(vi.mocked(encode)).toHaveBeenCalledWith([
        'Signature1',
        complexProtectedHeader,
        new Uint8Array(0),
        payload,
      ]);
    });
  });
});
