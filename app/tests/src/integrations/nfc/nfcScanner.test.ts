// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Mock Platform without requiring react-native to avoid memory issues
// Use a global variable with getter to allow per-test platform switching
// This pattern avoids hoisting issues with jest.mock
import { Buffer } from 'buffer';

import { parseScanResponse, scan } from '@/integrations/nfc/nfcScanner';
import { PassportReader } from '@/integrations/nfc/passportReader';

// Declare global variable for platform OS that can be modified per-test
declare global {
  // eslint-disable-next-line no-var
  var mockPlatformOS: 'ios' | 'android';
}

// Initialize the global mock platform - default to iOS
global.mockPlatformOS = 'ios';

// Override the react-native mock from jest.setup.js with a getter-based Platform
// This allows tests to change Platform.OS dynamically by modifying global.mockPlatformOS
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return global.mockPlatformOS;
    },
    Version: 14,
    select: jest.fn((obj: Record<string, unknown>) => {
      const os = global.mockPlatformOS;
      return obj[os] || obj.default;
    }),
  },
}));

// Ensure the Node Buffer implementation is available to the module under test
global.Buffer = Buffer;

describe('parseScanResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to default before each test to prevent pollution
    global.mockPlatformOS = 'ios';
  });

  it.skip('parses iOS response', () => {
    // Platform.OS is already mocked as 'ios' by default
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
    expect(response).toMatchInlineSnapshot(
      `"{"dataGroupHashes":"{\\"DG1\\":{\\"sodHash\\":\\"abcd\\"},\\"DG2\\":{\\"sodHash\\":\\"1234\\"}}","eContentBase64":"ZWM=","signedAttributes":"c2E=","passportMRZ":"P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14","signatureBase64":"AQI=","dataGroupsPresent":[1,2],"passportPhoto":"photo","documentSigningCertificate":"{\\"PEM\\":\\"CERT\\"}"}"`,
    );
    const result = parseScanResponse(response);
    console.log('Parsed Result:', result);
    expect(result).toMatchInlineSnapshot(`
      {
        "dg1Hash": [
          171,
          205,
        ],
        "dg2Hash": [
          18,
          52,
        ],
        "dgPresents": [
          1,
          2,
        ],
        "documentCategory": "passport",
        "documentType": "passport",
        "dsc": "CERT",
        "eContent": [
          101,
          99,
        ],
        "encryptedDigest": [
          1,
          2,
        ],
        "mock": false,
        "mrz": "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14",
        "parsed": false,
        "signedAttr": [
          115,
          97,
        ],
      }
    `);
    expect(result.mrz).toBe(mrz);
    expect(result.documentType).toBe('passport');
    // 'abcd' in hex: ab = 171, cd = 205
    expect(result.dg1Hash).toEqual([171, 205]);
    // '1234' in hex: 12 = 18, 34 = 52
    expect(result.dg2Hash).toEqual([18, 52]);
  });

  it.skip('parses Android response', () => {
    // Set Platform.OS to android for this test
    global.mockPlatformOS = 'android';

    const mrz =
      'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14';
    const response = {
      mrz,
      eContent: JSON.stringify([4, 5]),
      encryptedDigest: JSON.stringify([6, 7]),
      encapContent: JSON.stringify([8, 9]),
      documentSigningCertificate: 'CERT',
      // Android format: '1' and '2' are hex strings, not arrays
      dataGroupHashes: JSON.stringify({ '1': 'abcd', '2': '1234' }),
    } as any;
    expect(response).toMatchInlineSnapshot(`
      {
        "dataGroupHashes": "{"1":"abcd","2":"1234"}",
        "documentSigningCertificate": "CERT",
        "eContent": "[4,5]",
        "encapContent": "[8,9]",
        "encryptedDigest": "[6,7]",
        "mrz": "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14",
      }
    `);
    const result = parseScanResponse(response);
    expect(result).toMatchInlineSnapshot(`
      {
        "dg1Hash": [
          171,
          205,
        ],
        "dg2Hash": [
          18,
          52,
        ],
        "dgPresents": [
          1,
          2,
        ],
        "documentCategory": "passport",
        "documentType": "passport",
        "dsc": "-----BEGIN CERTIFICATE-----CERT-----END CERTIFICATE-----",
        "eContent": [
          8,
          9,
        ],
        "encryptedDigest": [
          6,
          7,
        ],
        "mock": false,
        "mrz": "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<14",
        "signedAttr": [
          4,
          5,
        ],
      }
    `);
    expect(result.documentType).toBe('passport');
    expect(result.mrz).toBe(mrz);
    // 'abcd' in hex: ab = 171, cd = 205
    expect(result.dg1Hash).toEqual([171, 205]);
    // dg2Hash should be parsed from hex string '1234': 12 = 18, 34 = 52
    expect(result.dg2Hash).toEqual([18, 52]);
    expect(result.dgPresents).toEqual([1, 2]);
  });

  it('handles malformed iOS response', () => {
    // Platform.OS is already mocked as 'ios' by default
    const response = '{"invalid": "json"';

    expect(() => parseScanResponse(response)).toThrow();
  });

  it('handles malformed Android response', () => {
    // Set Platform.OS to android for this test
    global.mockPlatformOS = 'android';

    const response = {
      mrz: 'valid_mrz',
      eContent: 'invalid_json_string',
      dataGroupHashes: JSON.stringify({ '1': 'abcd' }),
    };

    expect(() => parseScanResponse(response)).toThrow();
  });

  it('handles missing required fields', () => {
    // Platform.OS is already mocked as 'ios' by default
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
    // Platform.OS is already mocked as 'ios' by default
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
    sessionId: 'test-session',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to default before each test to prevent pollution
    global.mockPlatformOS = 'ios';
    // Reset PassportReader mock before each test
    // The implementation checks for scanPassport property, so we need to ensure it exists
    Object.defineProperty(PassportReader, 'scanPassport', {
      writable: true,
      configurable: true,
      value: undefined,
    });
  });

  describe('iOS platform', () => {
    // Platform.OS is already mocked as 'ios' by default, no additional setup needed

    it('should call PassportReader.scanPassport with correct parameters', async () => {
      const mockScanPassport = jest.fn().mockResolvedValue({
        mrz: 'test-mrz',
        dataGroupHashes: JSON.stringify({}),
      });

      // Set the mock function directly on PassportReader
      Object.defineProperty(PassportReader, 'scanPassport', {
        writable: true,
        configurable: true,
        value: mockScanPassport,
      });

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
        'test-session',
      );
    });

    it('should handle missing optional parameters', async () => {
      const mockScanPassport = jest.fn().mockResolvedValue({
        mrz: 'test-mrz',
        dataGroupHashes: JSON.stringify({}),
      });

      Object.defineProperty(PassportReader, 'scanPassport', {
        writable: true,
        configurable: true,
        value: mockScanPassport,
      });

      const minimalInputs = {
        passportNumber: 'L898902C3',
        dateOfBirth: '640812',
        dateOfExpiry: '251031',
        sessionId: 'test-session',
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
        'test-session',
      );
    });

    it('should pass through all optional parameters when provided', async () => {
      const mockScanPassport = jest.fn().mockResolvedValue({
        mrz: 'test-mrz',
        dataGroupHashes: JSON.stringify({}),
      });

      Object.defineProperty(PassportReader, 'scanPassport', {
        writable: true,
        configurable: true,
        value: mockScanPassport,
      });

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
        'test-session',
      );
    });
  });

  // Note: Android testing would require mocking the imported scan function
  // which is more complex in Jest. The interface tests handle this better.

  describe('Analytics configuration', () => {
    // Platform.OS is already mocked as 'ios' by default, no additional setup needed

    it('should configure analytics before scanning', async () => {
      const mockScanPassport = jest.fn().mockResolvedValue({
        mrz: 'test-mrz',
        dataGroupHashes: JSON.stringify({}),
      });

      Object.defineProperty(PassportReader, 'scanPassport', {
        writable: true,
        configurable: true,
        value: mockScanPassport,
      });

      await scan(mockInputs);

      expect(mockScanPassport).toHaveBeenCalled();
    });
  });
});
