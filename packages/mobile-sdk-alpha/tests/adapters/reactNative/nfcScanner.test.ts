// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Buffer } from 'buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { reactNativeScannerAdapter } from '../../../src/adapters/react-native/nfc-scanner';

// Hoist mock variables so they're available to vi.mock
const { mockPlatformOS, mockNativeModules } = vi.hoisted(() => ({
  mockPlatformOS: { current: 'ios' },
  mockNativeModules: {} as Record<string, any>,
}));

vi.mock('react-native', () => ({
  NativeModules: mockNativeModules,
  Platform: {
    get OS() {
      return mockPlatformOS.current;
    },
    select: (obj: any) => obj[mockPlatformOS.current] || obj.default,
  },
}));

describe('reactNativeScannerAdapter', () => {
  const mockScanOpts = {
    passportNumber: 'L898902C3',
    dateOfBirth: '640812',
    dateOfExpiry: '251031',
    canNumber: '123456',
    useCan: false,
    sessionId: 'test-session',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock native modules
    Object.keys(mockNativeModules).forEach(key => delete mockNativeModules[key]);
  });

  describe('iOS platform', () => {
    beforeEach(() => {
      mockPlatformOS.current = 'ios';
    });

    it('should call SelfPassportReader.scanPassport with correct parameters', async () => {
      const mockScanPassport = vi.fn().mockResolvedValue(
        JSON.stringify({
          passportMRZ: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14',
          dataGroupHashes: JSON.stringify({
            DG1: { sodHash: 'abcd' },
            DG2: { sodHash: '1234' },
          }),
          eContentBase64: Buffer.from('ec').toString('base64'),
          signedAttributes: Buffer.from('sa').toString('base64'),
          signatureBase64: Buffer.from([1, 2]).toString('base64'),
          dataGroupsPresent: [1, 2],
          documentSigningCertificate: JSON.stringify({ PEM: 'CERT' }),
        }),
      );

      mockNativeModules.SelfPassportReader = {
        scanPassport: mockScanPassport,
        reset: vi.fn(),
      };

      await reactNativeScannerAdapter.scan(mockScanOpts);

      expect(mockScanPassport).toHaveBeenCalledWith(
        'L898902C3',
        '640812',
        '251031',
        '123456',
        false, // useCan
        false, // skipPACE
        false, // skipCA
        false, // extendedMode
        false, // usePacePolling
      );
    });

    it('should handle missing optional parameters', async () => {
      const mockScanPassport = vi.fn().mockResolvedValue(
        JSON.stringify({
          passportMRZ: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14',
          dataGroupHashes: JSON.stringify({
            DG1: { sodHash: 'abcd' },
            DG2: { sodHash: '1234' },
          }),
          eContentBase64: Buffer.from('ec').toString('base64'),
          signedAttributes: Buffer.from('sa').toString('base64'),
          signatureBase64: Buffer.from([1, 2]).toString('base64'),
          dataGroupsPresent: [1, 2],
          documentSigningCertificate: JSON.stringify({ PEM: 'CERT' }),
        }),
      );

      mockNativeModules.SelfPassportReader = {
        scanPassport: mockScanPassport,
        reset: vi.fn(),
      };

      const minimalOpts = {
        passportNumber: 'L898902C3',
        dateOfBirth: '640812',
        dateOfExpiry: '251031',
        sessionId: 'test-session',
      };

      await reactNativeScannerAdapter.scan(minimalOpts);

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
      const mockScanPassport = vi.fn().mockResolvedValue(
        JSON.stringify({
          passportMRZ: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14',
          dataGroupHashes: JSON.stringify({
            DG1: { sodHash: 'abcd' },
            DG2: { sodHash: '1234' },
          }),
          eContentBase64: Buffer.from('ec').toString('base64'),
          signedAttributes: Buffer.from('sa').toString('base64'),
          signatureBase64: Buffer.from([1, 2]).toString('base64'),
          dataGroupsPresent: [1, 2],
          documentSigningCertificate: JSON.stringify({ PEM: 'CERT' }),
        }),
      );

      mockNativeModules.SelfPassportReader = {
        scanPassport: mockScanPassport,
        reset: vi.fn(),
      };

      const fullOpts = {
        ...mockScanOpts,
        useCan: true,
        skipPACE: true,
        skipCA: true,
        extendedMode: true,
        usePacePolling: true,
      };

      await reactNativeScannerAdapter.scan(fullOpts);

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

    it('should return properly formatted PassportData', async () => {
      const mockMrz = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14';
      const mockScanPassport = vi.fn().mockResolvedValue(
        JSON.stringify({
          passportMRZ: mockMrz,
          dataGroupHashes: JSON.stringify({
            DG1: { sodHash: 'abcd' },
            DG2: { sodHash: '1234' },
          }),
          eContentBase64: Buffer.from('ec').toString('base64'),
          signedAttributes: Buffer.from('sa').toString('base64'),
          signatureBase64: Buffer.from([1, 2]).toString('base64'),
          dataGroupsPresent: [1, 2],
          documentSigningCertificate: JSON.stringify({ PEM: 'CERT' }),
        }),
      );

      mockNativeModules.SelfPassportReader = {
        scanPassport: mockScanPassport,
        reset: vi.fn(),
      };

      const result = await reactNativeScannerAdapter.scan(mockScanOpts);

      expect(result).toHaveProperty('passportData');
      expect(result.passportData).toMatchObject({
        mrz: mockMrz,
        documentType: 'passport',
        dsc: 'CERT',
        parsed: false,
        mock: false,
      });
    });
  });

  describe('Android platform', () => {
    beforeEach(() => {
      mockPlatformOS.current = 'android';
    });

    it('should call SelfPassportReader.scan with correct parameters', async () => {
      const mockScan = vi.fn().mockResolvedValue({
        mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14',
        eContent: JSON.stringify([4, 5]),
        encryptedDigest: JSON.stringify([6, 7]),
        encapContent: JSON.stringify([8, 9]),
        documentSigningCertificate: 'CERT',
        dataGroupHashes: JSON.stringify({ '1': 'abcd', '2': [1, 2, 3] }),
      });

      mockNativeModules.SelfPassportReader = {
        scan: mockScan,
        reset: vi.fn(),
      };

      await reactNativeScannerAdapter.scan(mockScanOpts);

      expect(mockScan).toHaveBeenCalledWith({
        documentNumber: 'L898902C3',
        dateOfBirth: '640812',
        dateOfExpiry: '251031',
        canNumber: '123456',
        useCan: false,
      });
    });

    it('should return properly formatted PassportData', async () => {
      const mockMrz = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14';
      const mockScan = vi.fn().mockResolvedValue({
        mrz: mockMrz,
        eContent: JSON.stringify([4, 5]),
        encryptedDigest: JSON.stringify([6, 7]),
        encapContent: JSON.stringify([8, 9]),
        documentSigningCertificate: 'CERT',
        dataGroupHashes: JSON.stringify({ '1': 'abcd', '2': [1, 2, 3] }),
      });

      mockNativeModules.SelfPassportReader = {
        scan: mockScan,
        reset: vi.fn(),
      };

      const result = await reactNativeScannerAdapter.scan(mockScanOpts);

      expect(result).toHaveProperty('passportData');
      expect(result.passportData).toMatchObject({
        mrz: mockMrz,
        documentType: 'passport',
        parsed: false,
        mock: false,
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error for unsupported platforms', async () => {
      mockPlatformOS.current = 'web';

      await expect(reactNativeScannerAdapter.scan(mockScanOpts)).rejects.toThrow('Platform web not supported');
    });

    it('should throw error when native module is not available on iOS', async () => {
      mockPlatformOS.current = 'ios';
      mockNativeModules.SelfPassportReader = undefined;

      await expect(reactNativeScannerAdapter.scan(mockScanOpts)).rejects.toThrow('PassportReader not found');
    });

    it('should throw error when required fields are missing', async () => {
      mockPlatformOS.current = 'ios';
      mockNativeModules.SelfPassportReader = {
        scanPassport: vi.fn(),
        reset: vi.fn(),
      };

      const invalidOpts = {
        passportNumber: '',
        dateOfBirth: '640812',
        dateOfExpiry: '251031',
        sessionId: 'test-session',
      };

      await expect(reactNativeScannerAdapter.scan(invalidOpts)).rejects.toThrow(
        'NFC scanning requires passportNumber, dateOfBirth, and dateOfExpiry',
      );
    });
  });
});
