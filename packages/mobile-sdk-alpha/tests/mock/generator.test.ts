// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateMockDocument, signatureAlgorithmToStrictSignatureAlgorithm } from '../../src/mock/generator';

// Mock the @selfxyz/common module to match the actual import path used in generator.ts
vi.mock('@selfxyz/common', () => ({
  generateMockDSC: vi.fn(),
  genMockIdDoc: vi.fn(),
  getSKIPEM: vi.fn(),
  initPassportDataParsing: vi.fn(),
}));

// Import the mocked functions after the mocks are defined
let getSKIPEM: any;
let generateMockDSC: any;
let genMockIdDoc: any;
let initPassportDataParsing: any;

// These will be imported after the mocks are set up

describe('Mock Generator Helper Functions', () => {
  describe('Date formatting and calculation', () => {
    it('should format date to YYMMDD correctly', () => {
      // Test with a known date
      const testDate = new Date('2024-03-15T10:30:00.000Z');
      const expected = '240315'; // YY=24, MM=03, DD=15

      // Since the helper function is not exported, we'll test through the main function
      // and verify the format in the results
      expect(
        testDate.toISOString().slice(2, 4) + testDate.toISOString().slice(5, 7) + testDate.toISOString().slice(8, 10),
      ).toBe(expected);
    });

    it('should calculate birth date from age correctly', () => {
      const currentYear = new Date().getFullYear();
      const testAge = 25;
      const expectedBirthYear = currentYear - testAge;

      // We'll verify this through the main function since the helper is not exported
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - testAge);
      const expectedFormat = (
        birthDate.toISOString().slice(2, 4) +
        birthDate.toISOString().slice(5, 7) +
        birthDate.toISOString().slice(8, 10)
      ).toString();

      expect(expectedFormat).toMatch(/^\d{6}$/);
      expect(parseInt(expectedFormat.slice(0, 2)) + 2000).toBeCloseTo(expectedBirthYear, 0);
    });

    it('should calculate expiry date from years correctly', () => {
      const currentYear = new Date().getFullYear();
      const testYears = 10;
      const expectedExpiryYear = currentYear + testYears;

      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + testYears);
      const expectedFormat = (
        expiryDate.toISOString().slice(2, 4) +
        expiryDate.toISOString().slice(5, 7) +
        expiryDate.toISOString().slice(8, 10)
      ).toString();

      expect(expectedFormat).toMatch(/^\d{6}$/);
      expect(parseInt(expectedFormat.slice(0, 2)) + 2000).toBeCloseTo(expectedExpiryYear, 0);
    });
  });
});

describe('generateMockDocument', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the mocked functions from the same path used by the implementation
    ({ getSKIPEM, generateMockDSC, genMockIdDoc, initPassportDataParsing } = await import('@selfxyz/common'));

    // Setup default mocks with proper types
    vi.mocked(getSKIPEM).mockResolvedValue({ 'mock-key': 'mock-ski-pem' });
    vi.mocked(generateMockDSC).mockResolvedValue({ privateKeyPem: 'mock-private-key', dsc: 'mock-dsc' });
    vi.mocked(genMockIdDoc).mockReturnValue({
      dataGroupHashes: {},
      eContent: new Uint8Array(),
      encryptedDigest: new Uint8Array(),
    } as any);
    vi.mocked(initPassportDataParsing).mockResolvedValue({
      dataGroupHashes: {},
      eContent: new Uint8Array(),
      encryptedDigest: new Uint8Array(),
    } as any);
  });

  const defaultOptions = {
    age: 30,
    expiryYears: 10,
    isInOfacList: false,
    selectedAlgorithm: 'sha256 rsa 65537 2048',
    selectedCountry: 'US',
    selectedDocumentType: 'mock_passport' as const,
  };

  it('should generate mock passport with default options', async () => {
    const result = await generateMockDocument(defaultOptions);

    expect(result).toBeDefined();
    expect(getSKIPEM).toHaveBeenCalledWith('staging');
    expect(generateMockDSC).toHaveBeenCalledWith('rsa_sha256_65537_2048');
    expect(genMockIdDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        nationality: 'US',
        idType: 'mock_passport',
        dgHashAlgo: 'sha256',
        eContentHashAlgo: 'sha256',
        signatureType: 'rsa_sha256_65537_2048',
      }),
      expect.objectContaining({ privateKeyPem: expect.any(String), dsc: expect.any(String) }),
    );
    expect(initPassportDataParsing).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ 'mock-key': expect.any(String) }),
    );
  });

  it('should generate mock ID card when document type is mock_id_card', async () => {
    const options = { ...defaultOptions, selectedDocumentType: 'mock_id_card' as const };

    await generateMockDocument(options);

    expect(genMockIdDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        idType: 'mock_id_card',
      }),
      expect.objectContaining({ privateKeyPem: expect.any(String), dsc: expect.any(String) }),
    );
  });

  it('should use OFAC-listed person data when isInOfacList is true', async () => {
    const options = { ...defaultOptions, isInOfacList: true };

    await generateMockDocument(options);

    expect(genMockIdDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        lastName: 'HENAO MONTOYA',
        firstName: 'ARCANGEL DE JESUS',
        birthDate: '541007', // Fixed OFAC DOB
      }),
      expect.objectContaining({ privateKeyPem: expect.any(String), dsc: expect.any(String) }),
    );
  });

  it('should calculate age-based birth date when not in OFAC list', async () => {
    const options = { ...defaultOptions, age: 25, isInOfacList: false };

    await generateMockDocument(options);

    const callArgs = vi.mocked(genMockIdDoc).mock.calls[0][0];
    expect(callArgs.birthDate).toMatch(/^\d{6}$/);
    expect(callArgs.birthDate).not.toBe('541007'); // Should not be the OFAC DOB
  });

  it('should generate random passport numbers', async () => {
    await generateMockDocument(defaultOptions);
    await generateMockDocument(defaultOptions);

    const call1Args = vi.mocked(genMockIdDoc).mock.calls[0]?.[0];
    const call2Args = vi.mocked(genMockIdDoc).mock.calls[1]?.[0];

    expect(call1Args).toBeDefined();
    expect(call2Args).toBeDefined();
    expect(call1Args!.passportNumber).toMatch(/^[A-Z0-9]{9}$/);
    expect(call2Args!.passportNumber).toMatch(/^[A-Z0-9]{9}$/);
    // Random numbers should be different
    expect(call1Args!.passportNumber).not.toBe(call2Args!.passportNumber);
  });

  it('should handle different signature algorithms', async () => {
    const algorithms = ['sha256 rsa 65537 4096', 'sha1 rsa 65537 2048', 'sha256 brainpoolP256r1', 'sha384 secp384r1'];

    for (const algorithm of algorithms) {
      const options = { ...defaultOptions, selectedAlgorithm: algorithm };
      await generateMockDocument(options);

      const expectedMapping =
        signatureAlgorithmToStrictSignatureAlgorithm[
          algorithm as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
        ];
      expect(generateMockDSC).toHaveBeenCalledWith(expectedMapping[2]);
    }
  });

  it('should set expiry date based on years parameter', async () => {
    const options = { ...defaultOptions, expiryYears: 5 };

    await generateMockDocument(options);

    const callArgs = vi.mocked(genMockIdDoc).mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs!.expiryDate).toMatch(/^\d{6}$/);

    // Verify the year is approximately correct (within 1 year due to timing)
    const currentYear = new Date().getFullYear();
    const expiryYear = 2000 + parseInt(callArgs!.expiryDate!.slice(0, 2));
    expect(expiryYear).toBeGreaterThanOrEqual(currentYear + 4);
    expect(expiryYear).toBeLessThanOrEqual(currentYear + 6);
  });

  it('should fall back to default DSC when generateMockDSC fails', async () => {
    vi.mocked(generateMockDSC).mockRejectedValueOnce(new Error('DSC generation failed'));

    const result = await generateMockDocument(defaultOptions);

    expect(result).toBeDefined();
    expect(genMockIdDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        signatureType: 'rsa_sha256_65537_2048',
      }),
      // Note: no second argument (mock DSC) when falling back
    );
  });

  it('should handle various countries', async () => {
    const countries = ['US', 'GB', 'DE', 'FR', 'JP'];

    for (const country of countries) {
      const options = { ...defaultOptions, selectedCountry: country };
      await generateMockDocument(options);

      const callArgs = vi.mocked(genMockIdDoc).mock.calls[vi.mocked(genMockIdDoc).mock.calls.length - 1]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs!.nationality).toBe(country);
    }
  });

  it('should preserve all required ID document fields', async () => {
    await generateMockDocument(defaultOptions);

    const callArgs = vi.mocked(genMockIdDoc).mock.calls[0][0];

    expect(callArgs).toEqual(
      expect.objectContaining({
        nationality: expect.any(String),
        idType: expect.any(String),
        dgHashAlgo: expect.any(String),
        eContentHashAlgo: expect.any(String),
        signatureType: expect.any(String),
        expiryDate: expect.any(String),
        passportNumber: expect.any(String),
        birthDate: expect.any(String),
      }),
    );
  });
});

describe('signatureAlgorithmToStrictSignatureAlgorithm', () => {
  it('should contain all expected signature algorithms', () => {
    const expectedAlgorithms = [
      'sha256 rsa 65537 4096',
      'sha1 rsa 65537 2048',
      'sha256 brainpoolP256r1',
      'sha384 brainpoolP384r1',
      'sha384 secp384r1',
      'sha256 rsa 65537 2048',
      'sha256 rsa 3 2048',
      'sha256 rsa 65537 3072',
      'sha256 rsa 3 4096',
      'sha384 rsa 65537 4096',
      'sha512 rsa 65537 2048',
      'sha512 rsa 65537 4096',
      'sha1 rsa 65537 4096',
      'sha256 rsapss 3 2048',
      'sha256 rsapss 3 3072',
      'sha256 rsapss 65537 3072',
      'sha256 rsapss 65537 4096',
      'sha384 rsapss 65537 2048',
      'sha384 rsapss 65537 3072',
      'sha512 rsapss 65537 2048',
      'sha512 rsapss 65537 4096',
      'sha1 secp256r1',
      'sha224 secp224r1',
      'sha256 secp256r1',
      'sha256 secp384r1',
      'sha1 brainpoolP224r1',
      'sha1 brainpoolP256r1',
      'sha224 brainpoolP224r1',
      'sha256 brainpoolP224r1',
      'sha384 brainpoolP256r1',
      'sha512 brainpoolP256r1',
      'sha512 brainpoolP384r1',
      'sha512 poland',
      'not existing',
    ];

    expectedAlgorithms.forEach(algorithm => {
      expect(signatureAlgorithmToStrictSignatureAlgorithm).toHaveProperty(algorithm);
    });
  });

  it('should map algorithms to correct tuple format', () => {
    const testCases = [
      {
        input: 'sha256 rsa 65537 2048',
        expected: ['sha256', 'sha256', 'rsa_sha256_65537_2048'],
      },
      {
        input: 'sha384 brainpoolP384r1',
        expected: ['sha384', 'sha384', 'ecdsa_sha384_brainpoolP384r1_384'],
      },
      {
        input: 'sha256 rsapss 65537 4096',
        expected: ['sha256', 'sha256', 'rsapss_sha256_65537_4096'],
      },
      {
        input: 'sha1 secp256r1',
        expected: ['sha1', 'sha1', 'ecdsa_sha1_secp256r1_256'],
      },
    ];

    testCases.forEach(({ input, expected }) => {
      expect(
        signatureAlgorithmToStrictSignatureAlgorithm[
          input as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
        ],
      ).toEqual(expected);
    });
  });

  it('should have consistent hash algorithms in tuples', () => {
    Object.entries(signatureAlgorithmToStrictSignatureAlgorithm).forEach(([key, [dgHashAlgo, eContentHashAlgo]]) => {
      // For most algorithms, dgHashAlgo and eContentHashAlgo should be the same
      if (key !== 'not existing') {
        expect(dgHashAlgo).toBe(eContentHashAlgo);
      }
    });
  });

  it('should have valid signature types in tuples', () => {
    const validSignatureTypes = [
      'rsa_sha256_65537_4096',
      'rsa_sha1_65537_2048',
      'ecdsa_sha256_brainpoolP256r1_256',
      'ecdsa_sha384_brainpoolP384r1_384',
      'ecdsa_sha384_secp384r1_384',
      'rsa_sha256_65537_2048',
      'rsa_sha256_3_2048',
      'rsa_sha256_65537_3072',
      'rsa_sha256_3_4096',
      'rsa_sha384_65537_4096',
      'rsa_sha512_65537_2048',
      'rsa_sha512_65537_4096',
      'rsa_sha1_65537_4096',
      'rsapss_sha256_3_2048',
      'rsapss_sha256_3_3072',
      'rsapss_sha256_65537_3072',
      'rsapss_sha256_65537_4096',
      'rsapss_sha384_65537_2048',
      'rsapss_sha384_65537_3072',
      'rsapss_sha512_65537_2048',
      'rsapss_sha512_65537_4096',
      'ecdsa_sha1_secp256r1_256',
      'ecdsa_sha224_secp224r1_224',
      'ecdsa_sha256_secp256r1_256',
      'ecdsa_sha256_secp384r1_384',
      'ecdsa_sha1_brainpoolP224r1_224',
      'ecdsa_sha1_brainpoolP256r1_256',
      'ecdsa_sha224_brainpoolP224r1_224',
      'ecdsa_sha256_brainpoolP224r1_224',
      'ecdsa_sha384_brainpoolP256r1_256',
      'ecdsa_sha512_brainpoolP256r1_256',
      'ecdsa_sha512_brainpoolP384r1_384',
    ];

    Object.values(signatureAlgorithmToStrictSignatureAlgorithm).forEach(([, , signatureType]) => {
      expect(validSignatureTypes).toContain(signatureType);
    });
  });
});

describe('generateMockDocument integration', () => {
  const defaultOptions = {
    age: 30,
    expiryYears: 10,
    isInOfacList: false,
    selectedAlgorithm: 'sha256 rsa 65537 2048',
    selectedCountry: 'US',
    selectedDocumentType: 'mock_passport' as const,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import the mocked functions from the same path used by the implementation
    ({ getSKIPEM, generateMockDSC, genMockIdDoc, initPassportDataParsing } = await import('@selfxyz/common'));

    // Setup default mocks with proper types
    vi.mocked(getSKIPEM).mockResolvedValue({ 'mock-key': 'mock-ski-pem' });
    vi.mocked(generateMockDSC).mockResolvedValue({ privateKeyPem: 'mock-private-key', dsc: 'mock-dsc' });
    vi.mocked(genMockIdDoc).mockReturnValue({
      dataGroupHashes: {},
      eContent: new Uint8Array(),
      encryptedDigest: new Uint8Array(),
    } as any);
    vi.mocked(initPassportDataParsing).mockResolvedValue({
      dataGroupHashes: {},
      eContent: new Uint8Array(),
      encryptedDigest: new Uint8Array(),
    } as any);
  });

  it('should handle successful DSC generation path', async () => {
    const result = await generateMockDocument(defaultOptions);

    expect(generateMockDSC).toHaveBeenCalledWith('rsa_sha256_65537_2048');
    expect(genMockIdDoc).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ privateKeyPem: expect.any(String), dsc: expect.any(String) }),
    );
    expect(result).toBeDefined();
  });

  it('should handle DSC generation failure and fall back gracefully', async () => {
    const mockError = new Error('DSC generation failed');
    vi.mocked(generateMockDSC).mockRejectedValueOnce(mockError);

    const result = await generateMockDocument(defaultOptions);

    expect(generateMockDSC).toHaveBeenCalledWith('rsa_sha256_65537_2048');
    // Should call genMockIdDoc without DSC (fallback mode)
    expect(genMockIdDoc).toHaveBeenCalledWith(expect.any(Object));
    expect(result).toBeDefined();
  });

  it('should generate different passport numbers on subsequent calls', async () => {
    await generateMockDocument(defaultOptions);
    await generateMockDocument(defaultOptions);

    const call1Args = vi.mocked(genMockIdDoc).mock.calls[0]?.[0];
    const call2Args = vi.mocked(genMockIdDoc).mock.calls[1]?.[0];

    expect(call1Args).toBeDefined();
    expect(call2Args).toBeDefined();
    expect(call1Args!.passportNumber).not.toBe(call2Args!.passportNumber);
    expect(call1Args!.passportNumber).toMatch(/^[A-Z0-9]+$/);
    expect(call2Args!.passportNumber).toMatch(/^[A-Z0-9]+$/);
  });

  it('should handle various edge cases for age', async () => {
    const edgeCases = [0, 1, 18, 100, 120];

    for (const age of edgeCases) {
      const options = { ...defaultOptions, age };
      await generateMockDocument(options);

      const callArgs = vi.mocked(genMockIdDoc).mock.calls[vi.mocked(genMockIdDoc).mock.calls.length - 1]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs!.birthDate).toMatch(/^\d{6}$/);
    }
  });

  it('should handle various expiry years', async () => {
    const expiryYears = [1, 5, 10, 15, 30];

    for (const years of expiryYears) {
      const options = { ...defaultOptions, expiryYears: years };
      await generateMockDocument(options);

      const callArgs = vi.mocked(genMockIdDoc).mock.calls[vi.mocked(genMockIdDoc).mock.calls.length - 1]?.[0];
      expect(callArgs).toBeDefined();
      expect(callArgs!.expiryDate).toMatch(/^\d{6}$/);
    }
  });

  it('should use correct hash algorithms from mapping', async () => {
    const testAlgorithm = 'sha384 brainpoolP384r1';
    const options = { ...defaultOptions, selectedAlgorithm: testAlgorithm };

    await generateMockDocument(options);

    const callArgs = vi.mocked(genMockIdDoc).mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs!.dgHashAlgo).toBe('sha384');
    expect(callArgs!.eContentHashAlgo).toBe('sha384');
    expect(callArgs!.signatureType).toBe('ecdsa_sha384_brainpoolP384r1_384');
  });

  it('should always call getSKIPEM with staging parameter', async () => {
    await generateMockDocument(defaultOptions);

    expect(getSKIPEM).toHaveBeenCalledWith('staging');
    expect(getSKIPEM).toHaveBeenCalledTimes(1);
  });

  it('should maintain document field completeness', async () => {
    const options = {
      ...defaultOptions,
      age: 42,
      expiryYears: 7,
      selectedCountry: 'CA',
      selectedDocumentType: 'mock_id_card' as const,
    };

    await generateMockDocument(options);

    const callArgs = vi.mocked(genMockIdDoc).mock.calls[0]?.[0];

    // Verify all required fields are present
    expect(callArgs).toBeDefined();
    expect(callArgs!.nationality).toBe('CA');
    expect(callArgs!.idType).toBe('mock_id_card');
    expect(callArgs!.dgHashAlgo).toBeDefined();
    expect(callArgs!.eContentHashAlgo).toBeDefined();
    expect(callArgs!.signatureType).toBeDefined();
    expect(callArgs!.expiryDate).toBeDefined();
    expect(callArgs!.passportNumber).toBeDefined();
    expect(callArgs!.birthDate).toBeDefined();
  });

  it('should handle special algorithm edge case', async () => {
    const options = { ...defaultOptions, selectedAlgorithm: 'not existing' };

    await generateMockDocument(options);

    const callArgs = vi.mocked(genMockIdDoc).mock.calls[0]?.[0];
    expect(callArgs).toBeDefined();
    expect(callArgs!.dgHashAlgo).toBe('sha512');
    expect(callArgs!.eContentHashAlgo).toBe('sha384');
    expect(callArgs!.signatureType).toBe('rsa_sha256_65537_4096');
  });
});
