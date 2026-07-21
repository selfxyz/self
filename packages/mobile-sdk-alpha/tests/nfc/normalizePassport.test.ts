// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import { normalizeNfcPassport } from '../../src/nfc/normalizePassport';

function bytesToBase64(bytes: number[]): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b & 0xff);
  return btoa(bin);
}

// Includes bytes > 127 so signed conversion is exercised.
const RAW_ECONTENT = [0, 1, 127, 128, 200, 255];
const RAW_SIGNED_ATTR = [10, 130, 255, 0];
const RAW_ENCRYPTED_DIGEST = [200, 5, 128, 127];
const SIGNED = (bytes: number[]) => bytes.map(b => (b > 127 ? b - 256 : b));

const PEM = '-----BEGIN CERTIFICATE-----\nMIICdummy\n-----END CERTIFICATE-----';

// 88-char TD3 MRZ -> passport
const MRZ_PASSPORT = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<<10';
// 90-char TD1 MRZ -> id_card
const MRZ_ID = 'I<UTOD231458907<<<<<<<<<<<<<<<7408122F1204159UTO<<<<<<<<<<<6ERIKSSON<<ANNA<MARIA<<<<<<<<<<';

function iosPayload(overrides: Record<string, unknown> = {}) {
  return {
    documentType: 'P',
    mrzString: MRZ_PASSPORT,
    sod: bytesToBase64([1, 2, 3]),
    documentSigningCertificate: PEM,
    hashAlgorithm: 'SHA256',
    signature: bytesToBase64(RAW_ENCRYPTED_DIGEST),
    signedAttributes: bytesToBase64(RAW_SIGNED_ATTR),
    // Forward-compatible: native does not emit this today (see gap note).
    encapContent: bytesToBase64(RAW_ECONTENT),
    dataGroupHashes: { DG1: 'aabb', DG2: 'ccdd' },
    ...overrides,
  };
}

function androidPayload(overrides: Record<string, unknown> = {}) {
  return {
    mrz: MRZ_PASSPORT,
    documentSigningCertificate: PEM,
    signatureAlgorithm: 'SHA256withRSA',
    digestAlgorithm: 'SHA-256',
    // io.tradle.nfc naming: `eContent` = signed attributes, `encapContent` = encapsulated content.
    eContent: bytesToBase64(RAW_SIGNED_ATTR),
    encryptedDigest: bytesToBase64(RAW_ENCRYPTED_DIGEST),
    encapContent: bytesToBase64(RAW_ECONTENT),
    dataGroupHashes: { '1': 'aabb', '2': 'ccdd', '14': 'eeff' },
    paceSucceeded: true,
    chipAuthSucceeded: false,
    ...overrides,
  };
}

function assertAllSignedInRange(arr: number[]) {
  for (const b of arr) {
    expect(b).toBeGreaterThanOrEqual(-128);
    expect(b).toBeLessThanOrEqual(127);
  }
}

describe('normalizeNfcPassport', () => {
  it('normalizes an iOS payload (forward-compatible encapContent present)', () => {
    const pd = normalizeNfcPassport(iosPayload());

    expect(pd.mrz).toBe(MRZ_PASSPORT);
    expect(pd.dsc).toContain('BEGIN CERTIFICATE');
    expect(pd.documentType).toBe('passport');
    expect(pd.documentCategory).toBe('passport');
    expect(pd.mock).toBe(false);

    expect(pd.eContent).toEqual(SIGNED(RAW_ECONTENT));
    expect(pd.signedAttr).toEqual(SIGNED(RAW_SIGNED_ATTR));
    expect(pd.encryptedDigest).toEqual(SIGNED(RAW_ENCRYPTED_DIGEST));
    assertAllSignedInRange(pd.eContent);
    assertAllSignedInRange(pd.signedAttr);
    assertAllSignedInRange(pd.encryptedDigest);

    // DG hashes: unsigned bytes, DG-name keys.
    expect(pd.dg1Hash).toEqual([0xaa, 0xbb]);
    expect(pd.dg2Hash).toEqual([0xcc, 0xdd]);
    expect(pd.dgPresents).toEqual([1, 2]);
  });

  it('normalizes an Android payload with io.tradle.nfc naming inversion', () => {
    const pd = normalizeNfcPassport(androidPayload());

    // eContent <- native encapContent, signedAttr <- native eContent.
    expect(pd.eContent).toEqual(SIGNED(RAW_ECONTENT));
    expect(pd.signedAttr).toEqual(SIGNED(RAW_SIGNED_ATTR));
    expect(pd.encryptedDigest).toEqual(SIGNED(RAW_ENCRYPTED_DIGEST));

    expect(pd.dsc).toContain('BEGIN CERTIFICATE');
    expect(pd.documentType).toBe('passport');
    expect(pd.dg1Hash).toEqual([0xaa, 0xbb]);
    expect(pd.dg2Hash).toEqual([0xcc, 0xdd]);
    // numeric-string keys, sorted.
    expect(pd.dgPresents).toEqual([1, 2, 14]);
  });

  it('has all 6 required PassportData fields populated', () => {
    const pd = normalizeNfcPassport(androidPayload());
    expect(pd.mrz.length).toBeGreaterThan(0);
    expect(pd.dsc.length).toBeGreaterThan(0);
    expect(pd.eContent.length).toBeGreaterThan(0);
    expect(pd.signedAttr.length).toBeGreaterThan(0);
    expect(pd.encryptedDigest.length).toBeGreaterThan(0);
    expect(['passport', 'id_card']).toContain(pd.documentCategory);
  });

  it('derives id_card documentCategory when MRZ length != 88', () => {
    const pd = normalizeNfcPassport(androidPayload({ mrz: MRZ_ID }));
    expect(pd.documentType).toBe('id_card');
    expect(pd.documentCategory).toBe('id_card');
  });

  it('strips newlines from the MRZ before length check', () => {
    const withNewline = MRZ_PASSPORT.slice(0, 44) + '\n' + MRZ_PASSPORT.slice(44);
    const pd = normalizeNfcPassport(androidPayload({ mrz: withNewline }));
    expect(pd.mrz).toBe(MRZ_PASSPORT);
    expect(pd.documentType).toBe('passport');
  });

  it('accepts a JSON string input as well as an object', () => {
    const pd = normalizeNfcPassport(JSON.stringify(androidPayload()));
    expect(pd.eContent).toEqual(SIGNED(RAW_ECONTENT));
  });

  it('wraps a bare-base64 DSC body into PEM', () => {
    const pd = normalizeNfcPassport(androidPayload({ documentSigningCertificate: 'MIICbareBody==' }));
    expect(pd.dsc.startsWith('-----BEGIN CERTIFICATE-----')).toBe(true);
    expect(pd.dsc.trim().endsWith('-----END CERTIFICATE-----')).toBe(true);
  });

  it('unwraps a legacy JSON-wrapped DSC ({PEM})', () => {
    const pd = normalizeNfcPassport(androidPayload({ documentSigningCertificate: JSON.stringify({ PEM }) }));
    expect(pd.dsc).toContain('BEGIN CERTIFICATE');
  });

  it('supports the legacy iOS dataGroupHashes {sodHash} nested shape', () => {
    const pd = normalizeNfcPassport(
      iosPayload({ dataGroupHashes: { DG1: { sodHash: 'aabb' }, DG2: { sodHash: 'ccdd' } } }),
    );
    expect(pd.dg1Hash).toEqual([0xaa, 0xbb]);
    expect(pd.dg2Hash).toEqual([0xcc, 0xdd]);
  });

  it('throws precisely when eContent source is missing (current iOS emitter)', () => {
    const payload = iosPayload();
    delete (payload as Record<string, unknown>).encapContent;
    expect(() => normalizeNfcPassport(payload)).toThrow(/missing required field/i);
    expect(() => normalizeNfcPassport(payload)).toThrow(/eContent/);
  });

  it('throws when MRZ is missing', () => {
    const payload = androidPayload();
    delete (payload as Record<string, unknown>).mrz;
    expect(() => normalizeNfcPassport(payload)).toThrow(/MRZ/i);
  });

  it('throws on a non-object input', () => {
    expect(() => normalizeNfcPassport(42)).toThrow(/not an object/i);
  });

  describe('strict decoding (fail-closed)', () => {
    it('throws on base64 with illegal characters instead of silently stripping', () => {
      expect(() => normalizeNfcPassport(androidPayload({ encapContent: '!' }))).toThrow(/invalid base64/i);
      expect(() => normalizeNfcPassport(androidPayload({ encapContent: 'AB!' }))).toThrow(/invalid base64/i);
    });

    it('throws on base64 with a lone remainder of 1 (truncated group)', () => {
      // 5 valid chars => remainder 1, impossible encoding.
      expect(() => normalizeNfcPassport(androidPayload({ encapContent: 'AAAAA' }))).toThrow(/invalid base64 length/i);
    });

    it('throws when a required byte field decodes to empty (padding only)', () => {
      expect(() => normalizeNfcPassport(androidPayload({ encryptedDigest: '==' }))).toThrow(
        /encryptedDigest present but empty/i,
      );
    });

    it('accepts valid base64 with proper padding unchanged', () => {
      // bytesToBase64 emits '=' padding; ensure padding is still accepted.
      const pd = normalizeNfcPassport(androidPayload({ encapContent: bytesToBase64([1, 2]) }));
      expect(pd.eContent).toEqual(SIGNED([1, 2]));
    });

    it('throws on DG hash hex with illegal characters', () => {
      expect(() => normalizeNfcPassport(androidPayload({ dataGroupHashes: { '1': 'aaxx', '2': 'ccdd' } }))).toThrow(
        /invalid hex/i,
      );
    });

    it('throws on DG hash hex with odd length', () => {
      expect(() => normalizeNfcPassport(androidPayload({ dataGroupHashes: { '1': 'aab', '2': 'ccdd' } }))).toThrow(
        /invalid hex length/i,
      );
    });

    it('throws when the DSC is present but decodes to an empty PEM body', () => {
      expect(() => normalizeNfcPassport(androidPayload({ documentSigningCertificate: '   ' }))).toThrow(
        /dsc present but empty/i,
      );
    });

    it('throws when the DSC has a BEGIN marker but no matching END marker', () => {
      expect(() =>
        normalizeNfcPassport(
          androidPayload({ documentSigningCertificate: '-----BEGIN CERTIFICATE-----\nMIICdummy' }),
        ),
      ).toThrow(/mismatched BEGIN\/END certificate markers/i);
    });

    it('throws when the DSC has an END marker but no matching BEGIN marker', () => {
      expect(() =>
        normalizeNfcPassport(
          androidPayload({ documentSigningCertificate: 'MIICdummy\n-----END CERTIFICATE-----' }),
        ),
      ).toThrow(/mismatched BEGIN\/END certificate markers/i);
    });

    it('accepts a well-formed PEM with both BEGIN and END markers', () => {
      const pd = normalizeNfcPassport(androidPayload({ documentSigningCertificate: PEM }));
      expect(pd.dsc).toContain('BEGIN CERTIFICATE');
      expect(pd.dsc).toContain('END CERTIFICATE');
    });
  });
});
