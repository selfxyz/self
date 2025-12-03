// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Register crypto polyfills
import { ethers } from 'ethers';

import '@/utils/crypto/ethers';

describe('ethers crypto polyfills', () => {
  it('randomBytes returns requested length and unique values', () => {
    const a = ethers.randomBytes(16);
    const b = ethers.randomBytes(16);

    expect(a).toHaveLength(16);
    expect(b).toHaveLength(16);
    expect(ethers.hexlify(a)).not.toBe(ethers.hexlify(b));
  });

  it('computeHmac matches known vector', () => {
    const result = ethers.computeHmac(
      'sha256',
      ethers.toUtf8Bytes('key'),
      ethers.toUtf8Bytes('data'),
    );
    expect(ethers.hexlify(result)).toBe(
      '0x5031fe3d989c6d1537a013fa6e739da23463fdaec3b70137d828e36ace221bd0',
    );
  });

  it('pbkdf2 derives expected key', () => {
    const derived = ethers.pbkdf2(
      ethers.toUtf8Bytes('password'),
      ethers.toUtf8Bytes('salt'),
      1000,
      32,
      'sha256',
    );
    expect(ethers.hexlify(derived)).toBe(
      '0x632c2812e46d4604102ba7618e9d6d7d2f8128f6266b4a03264d2a0460b7dcb3',
    );
  });

  it('sha256 hashes data correctly', () => {
    const digest = ethers.sha256(ethers.toUtf8Bytes('hello'));
    expect(ethers.hexlify(digest)).toBe(
      '0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('sha512 hashes data correctly', () => {
    const digest = ethers.sha512(ethers.toUtf8Bytes('hello'));
    expect(ethers.hexlify(digest)).toBe(
      '0x9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
    );
  });
});
