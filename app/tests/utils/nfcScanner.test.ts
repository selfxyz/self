// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Platform } from 'react-native';

import { configureNfcAnalytics } from '@/utils/analytics';
import { parseScanResponse, scan } from '@/utils/nfcScanner';
import { PassportReader } from '@/utils/passportReader';

// Mock the analytics module
jest.mock('@/utils/analytics', () => ({
  configureNfcAnalytics: jest.fn().mockResolvedValue(undefined),
}));

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

describe('scan', () => {
  const mockInputs = {
    passportNumber: 'L898902C3',
    dateOfBirth: '640812',
    dateOfExpiry: '251031',
    canNumber: '123456',
    useCan: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('iOS platform', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
    });

    it('should call PassportReader.scanPassport with correct parameters', async () => {
      const mockScanPassport = jest.fn().mockResolvedValue({
        mrz: 'test-mrz',
        dataGroupHashes: JSON.stringify({}),
      });

      (PassportReader as any).scanPassport = mockScanPassport;

      await scan(mockInputs);

      expect(mockScanPassport).toHaveBeenCalledWith(
        'L898902C3',
        '640812',
        '251031',
        '123456',
        false,
        false, // skipPACE
        false, // skipCA
        false, // extendedMode
        false, // usePacePolling
      );
    });

    it('should handle missing optional parameters', async () => {
      const mockScanPassport = jest.fn().mockResolvedValue({
        mrz: 'test-mrz',
        dataGroupHashes: JSON.stringify({}),
      });

      (PassportReader as any).scanPassport = mockScanPassport;

      const minimalInputs = {
        passportNumber: 'L898902C3',
        dateOfBirth: '640812',
        dateOfExpiry: '251031',
      };

      await scan(minimalInputs);

      expect(mockScanPassport).toHaveBeenCalledWith(
        'L898902C3',
        '640812',
        '251031',
        '', // canNumber default
        false, // useCan default
        false, // skipPACE default
        false, // skipCA default
        false, // extendedMode default
        false, // usePacePolling default
      );
    });

    it('should pass through all optional parameters when provided', async () => {
      const mockScanPassport = jest.fn().mockResolvedValue({
        mrz: 'test-mrz',
        dataGroupHashes: JSON.stringify({}),
      });

      (PassportReader as any).scanPassport = mockScanPassport;

      const fullInputs = {
        ...mockInputs,
        useCan: true,
        skipPACE: true,
        skipCA: true,
        extendedMode: true,
        usePacePolling: true,
      };

      await scan(fullInputs);

      expect(mockScanPassport).toHaveBeenCalledWith(
        'L898902C3',
        '640812',
        '251031',
        '123456',
        true, // useCan
        true, // skipPACE
        true, // skipCA
        true, // extendedMode
        true, // usePacePolling
      );
    });
  });

  // Note: Android testing would require mocking the imported scan function
  // which is more complex in Jest. The interface tests handle this better.

  describe('Analytics configuration', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
    });

    it('should configure analytics before scanning', async () => {
      const mockScanPassport = jest.fn().mockResolvedValue({
        mrz: 'test-mrz',
        dataGroupHashes: JSON.stringify({}),
      });

      const mockConfigureNfcAnalytics =
        configureNfcAnalytics as jest.MockedFunction<
          typeof configureNfcAnalytics
        >;

      (PassportReader as any).scanPassport = mockScanPassport;

      await scan(mockInputs);

      // Should configure analytics before scanning
      expect(mockConfigureNfcAnalytics).toHaveBeenCalled();
      expect(mockScanPassport).toHaveBeenCalled();
    });
  });
});
