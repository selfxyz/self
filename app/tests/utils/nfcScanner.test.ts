// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

import { parseScanResponse } from '@/utils/nfcScanner';

describe('parseScanResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses iOS response', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      writable: true,
    });
    const mrz =
      'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14';
    const response = JSON.stringify({
      dataGroupHashes: JSON.stringify({
        DG1: { sodHash: 'abcd' },
        DG2: { sodHash: '1234' },
      }),
      eContentBase64: Buffer.from('ec').toString('base64'),
      signedAttributes: Buffer.from('sa').toString('base64'),
      passportMRZ: mrz,
      signatureBase64: Buffer.from([1, 2]).toString('base64'),
      dataGroupsPresent: [1, 2],
      passportPhoto: 'photo',
      documentSigningCertificate: JSON.stringify({ PEM: 'CERT' }),
    });

    const result = parseScanResponse(response);
    expect(result.mrz).toBe(mrz);
    expect(result.documentType).toBe('passport');
    expect(result.dg1Hash).toEqual([171, 205]);
    expect(result.dg2Hash).toEqual([18, 52]);
  });

  it('parses Android response', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      writable: true,
    });
    const mrz =
      'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14';
    const response = {
      mrz,
      eContent: JSON.stringify([4, 5]),
      encryptedDigest: JSON.stringify([6, 7]),
      encapContent: JSON.stringify([8, 9]),
      documentSigningCertificate: 'CERT',
      dataGroupHashes: JSON.stringify({ '1': 'abcd', '2': [1, 2, 3] }),
    } as any;

    const result = parseScanResponse(response);
    expect(result.documentType).toBe('passport');
    expect(result.mrz).toBe(mrz);
    expect(result.dg1Hash).toEqual([171, 205]);
    expect(result.dgPresents).toEqual([1, 2]);
  });

  it('handles malformed iOS response', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      writable: true,
    });
    const response = '{"invalid": "json"';

    expect(() => parseScanResponse(response)).toThrow();
  });

  it('handles malformed Android response', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      writable: true,
    });
    const response = {
      mrz: 'valid_mrz',
      eContent: 'invalid_json_string',
      dataGroupHashes: JSON.stringify({ '1': 'abcd' }),
    };

    expect(() => parseScanResponse(response)).toThrow();
  });

  it('handles missing required fields', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      writable: true,
    });
    const response = JSON.stringify({
      // Providing minimal data but missing critical passportMRZ field
      dataGroupHashes: JSON.stringify({
        DG1: { sodHash: '00' }, // Minimal valid hex
        DG2: { sodHash: '00' }, // Minimal valid hex
      }),
      eContentBase64: Buffer.from('').toString('base64'),
      signedAttributes: Buffer.from('').toString('base64'),
      signatureBase64: Buffer.from('').toString('base64'),
      dataGroupsPresent: [],
      documentSigningCertificate: JSON.stringify({ PEM: 'CERT' }),
      // Missing passportMRZ which should cause an error
    });

    expect(() => parseScanResponse(response)).toThrow();
  });

  it('handles invalid hex data in dataGroupHashes', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      writable: true,
    });
    const response = JSON.stringify({
      dataGroupHashes: JSON.stringify({
        DG1: { sodHash: 'invalid_hex' },
      }),
      passportMRZ: 'valid_mrz',
    });

    expect(() => parseScanResponse(response)).toThrow();
  });
});
