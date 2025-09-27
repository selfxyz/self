// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it, vi } from 'vitest';

import { formatMrz, genAndInitMockPassportData, hash } from '@selfxyz/common';

import { isPassportDataValid } from '../../src/validation/document';

const basePassport = genAndInitMockPassportData('sha256', 'sha256', 'rsa_sha256_65537_4096', 'FRA', '940131', '401031');
const baseWithHash = {
  ...basePassport,
  dg1Hash: hash('sha256', formatMrz(basePassport.mrz)) as number[],
};

describe('isPassportDataValid', () => {
  it('returns true for valid data', () => {
    expect(isPassportDataValid(basePassport)).toBe(true);
  });

  it('returns false when metadata missing', () => {
    const noMeta = { ...basePassport, passportMetadata: undefined } as any;
    expect(isPassportDataValid(noMeta)).toBe(false);
  });

  it('returns false when dg1HashFunction is missing', () => {
    const noHashFunc = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, dg1HashFunction: undefined },
    } as any;
    expect(isPassportDataValid(noHashFunc)).toBe(false);
  });

  it('returns false when eContentHashFunction is missing', () => {
    const noHashFunc = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, eContentHashFunction: undefined },
    } as any;
    expect(isPassportDataValid(noHashFunc)).toBe(false);
  });

  it('returns false when signedAttrHashFunction is missing', () => {
    const noHashFunc = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, signedAttrHashFunction: undefined },
    } as any;
    expect(isPassportDataValid(noHashFunc)).toBe(false);
  });

  it('returns false for unsupported hash algorithm', () => {
    const badAlgo = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, dg1HashFunction: 'md5' },
    } as any;
    expect(isPassportDataValid(badAlgo)).toBe(false);
  });

  it('returns false when dg1 hash mismatches', () => {
    const tampered = { ...baseWithHash, dg1Hash: [...baseWithHash.dg1Hash] };
    tampered.dg1Hash[0] ^= 0xff;
    expect(isPassportDataValid(tampered)).toBe(false);
  });

  it('returns true when dg1Hash array is empty', () => {
    const emptyHash = { ...basePassport, dg1Hash: [] };
    expect(isPassportDataValid(emptyHash)).toBe(true);
  });

  it('handles null passport data', () => {
    expect(isPassportDataValid(null as any)).toBe(false);
  });

  it('handles undefined passport data', () => {
    expect(isPassportDataValid(undefined as any)).toBe(false);
  });

  it('returns false when MRZ string is empty', () => {
    const noMrz = { ...basePassport, mrz: '' } as any;
    expect(isPassportDataValid(noMrz)).toBe(false);
  });

  it('returns false for unsupported hash algorithm in eContentHashFunction', () => {
    const badAlgo = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, eContentHashFunction: 'md5' },
    } as any;
    expect(isPassportDataValid(badAlgo)).toBe(false);
  });

  it('returns false for unsupported hash algorithm in signedAttrHashFunction', () => {
    const badAlgo = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, signedAttrHashFunction: 'md5' },
    } as any;
    expect(isPassportDataValid(badAlgo)).toBe(false);
  });

  it('returns true when dg1Hash is undefined', () => {
    const noHash = { ...basePassport, dg1Hash: undefined };
    expect(isPassportDataValid(noHash)).toBe(true);
  });

  it('returns true when dg1Hash is null', () => {
    const noHash = { ...basePassport, dg1Hash: null } as any;
    expect(isPassportDataValid(noHash)).toBe(true);
  });

  it('handles callback invocation correctly', () => {
    const callbacks = {
      onPassportDataNull: vi.fn(),
      onPassportMetadataNull: vi.fn(),
      onDg1HashFunctionNull: vi.fn(),
      onEContentHashFunctionNull: vi.fn(),
      onSignedAttrHashFunctionNull: vi.fn(),
      onDg1HashMismatch: vi.fn(),
      onUnsupportedHashAlgorithm: vi.fn(),
      onDg1HashMissing: vi.fn(),
    };

    // Test null passport data
    isPassportDataValid(undefined, callbacks);
    expect(callbacks.onPassportDataNull).toHaveBeenCalledOnce();

    // Test missing metadata
    const noMeta = { ...basePassport, passportMetadata: undefined } as any;
    isPassportDataValid(noMeta, callbacks);
    expect(callbacks.onPassportMetadataNull).toHaveBeenCalledWith(noMeta);

    // Test missing dg1HashFunction
    const noHashFunc = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, dg1HashFunction: undefined },
    } as any;
    isPassportDataValid(noHashFunc, callbacks);
    expect(callbacks.onDg1HashFunctionNull).toHaveBeenCalledWith(noHashFunc);

    // Test hash mismatch
    const tampered = { ...baseWithHash, dg1Hash: [...baseWithHash.dg1Hash] };
    tampered.dg1Hash[0] ^= 0xff;
    isPassportDataValid(tampered, callbacks);
    expect(callbacks.onDg1HashMismatch).toHaveBeenCalledWith(tampered);

    // Test unsupported hash algorithm
    const badAlgo = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, dg1HashFunction: 'md5' },
    } as any;
    isPassportDataValid(badAlgo, callbacks);
    expect(callbacks.onUnsupportedHashAlgorithm).toHaveBeenCalledWith('dg1', 'md5', badAlgo);

    // Test missing DG1 hash
    const noHash = { ...basePassport, dg1Hash: undefined };
    isPassportDataValid(noHash, callbacks);
    expect(callbacks.onDg1HashMissing).toHaveBeenCalledWith(noHash);
  });

  it('handles unsupported hash algorithms with specific field tracking', () => {
    const callbacks = {
      onUnsupportedHashAlgorithm: vi.fn(),
    };

    // Test unsupported dg1HashFunction
    const badDg1 = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, dg1HashFunction: 'md5' },
    } as any;
    isPassportDataValid(badDg1, callbacks);
    expect(callbacks.onUnsupportedHashAlgorithm).toHaveBeenCalledWith('dg1', 'md5', badDg1);

    // Test unsupported eContentHashFunction
    const badEContent = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, eContentHashFunction: 'sha1' },
    } as any;
    isPassportDataValid(badEContent, callbacks);
    expect(callbacks.onUnsupportedHashAlgorithm).toHaveBeenCalledWith('eContent', 'sha1', badEContent);

    // Test unsupported signedAttrHashFunction
    const badSignedAttr = {
      ...basePassport,
      passportMetadata: { ...basePassport.passportMetadata, signedAttrHashFunction: 'ripemd160' },
    } as any;
    isPassportDataValid(badSignedAttr, callbacks);
    expect(callbacks.onUnsupportedHashAlgorithm).toHaveBeenCalledWith('signedAttr', 'ripemd160', badSignedAttr);
  });

  it('handles missing DG1 hash with callback', () => {
    const callbacks = {
      onDg1HashMissing: vi.fn(),
    };

    // Test undefined dg1Hash
    const noHash = { ...basePassport, dg1Hash: undefined };
    isPassportDataValid(noHash, callbacks);
    expect(callbacks.onDg1HashMissing).toHaveBeenCalledWith(noHash);

    // Test null dg1Hash
    const nullHash = { ...basePassport, dg1Hash: null } as any;
    isPassportDataValid(nullHash, callbacks);
    expect(callbacks.onDg1HashMissing).toHaveBeenCalledWith(nullHash);

    // Test empty dg1Hash array
    const emptyHash = { ...basePassport, dg1Hash: [] };
    isPassportDataValid(emptyHash, callbacks);
    expect(callbacks.onDg1HashMissing).toHaveBeenCalledWith(emptyHash);
  });
});
