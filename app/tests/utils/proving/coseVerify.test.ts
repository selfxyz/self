// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Buffer } from 'buffer';
const { decode, encode } = require('@stablelib/cbor');

const cose = require('../../../src/utils/proving/cose').default;

jest.mock('elliptic', () => {
  const verifyMock = jest.fn();
  const ecMock = jest.fn(() => ({
    keyFromPublic: jest.fn(() => ({ verify: verifyMock })),
  }));
  return { __esModule: true, ec: ecMock, __verifyMock: verifyMock };
});

const { __verifyMock } = require('elliptic');

describe('cose.sign.verify', () => {
  const verifier = { key: { x: '00', y: '00', curve: 'p256' } };
  const protectedHeaderBytes = new Uint8Array([0xa0]);
  const payload = Buffer.from('hi');
  const signature = Buffer.alloc(8);
  const data = Buffer.from([1]);

  it('accepts valid signature', async () => {
    __verifyMock.mockReturnValue(true);
    (decode as jest.Mock).mockReturnValue([protectedHeaderBytes, {}, payload, signature]);
    (encode as jest.Mock).mockReturnValue(new Uint8Array([0]));
    await expect(
      cose.sign.verify(data, verifier, { defaultType: 18 }),
    ).resolves.toBeUndefined();
  });

  it('rejects invalid signature', async () => {
    __verifyMock.mockReturnValue(false);
    (decode as jest.Mock).mockReturnValue([protectedHeaderBytes, {}, payload, signature]);
    (encode as jest.Mock).mockReturnValue(new Uint8Array([0]));
    await expect(
      cose.sign.verify(data, verifier, { defaultType: 18 }),
    ).rejects.toThrow('AWS root certificate signature verification failed');
  });
});
