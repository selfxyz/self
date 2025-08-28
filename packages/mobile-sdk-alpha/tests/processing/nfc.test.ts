// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { NfcParseError, parseNFCResponse } from '../../src';

const enc = new TextEncoder();
const mrz = `P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10`;

function tlv(tag: number, data: Uint8Array) {
  const len = data.length;
  return new Uint8Array([tag, len, ...data]);
}

describe('parseNFCResponse', () => {
  it('parses DG1 and DG2', () => {
    const dg1 = tlv(0x61, enc.encode(mrz));
    const dg2Data = new Uint8Array([1, 2, 3]);
    const dg2 = tlv(0x75, dg2Data);
    const bytes = new Uint8Array([...dg1, ...dg2]);
    const res = parseNFCResponse(bytes);
    expect(res.dg1?.mrz).toBe(mrz);
    expect(res.dg2?.image).toEqual(dg2Data);
  });

  it('throws on truncated data', () => {
    const bad = new Uint8Array([0x61, 0x05, 0x01]);
    expect(() => parseNFCResponse(bad)).toThrowError(NfcParseError);
  });

  it('ignores unknown tags', () => {
    const unknown = tlv(0x01, new Uint8Array([0xff]));
    const res = parseNFCResponse(unknown);
    expect(res).toEqual({});
  });
});
