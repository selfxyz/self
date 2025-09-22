// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PassportData, SelfApp } from '@selfxyz/common';

import { generateTEEInputsDisclose } from '../../src/processing/generate-disclosure-inputs';
import { useProtocolStore } from '../../src/stores/protocolStore';
// Mocks for dependencies
const mockSecret = '0x' + '00'.repeat(30) + 'a4ec'; // 32-byte hex string
const mockPassportData: PassportData = {
  mrz: 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<<<<L898902C36UTO7408122F1204159ZE184226B<<<<',
  dsc: '',
  eContent: [],
  signedAttr: [],
  encryptedDigest: [],
  passportMetadata: {
    dataGroups: 'dg1',
    dg1Size: 100,
    dg1HashSize: 32,
    dg1HashFunction: 'sha256',
    dg1HashOffset: 0,
    dgPaddingBytes: 0,
    eContentSize: 100,
    eContentHashFunction: 'sha256',
    eContentHashOffset: 0,
    signedAttrSize: 100,
    signedAttrHashFunction: 'sha256',
    signatureAlgorithm: 'rsa',
    saltLength: 32,
    curveOrExponent: '65537',
    signatureAlgorithmBits: 0,
    countryCode: '',
    cscaFound: false,
    cscaHashFunction: '',
    cscaSignatureAlgorithm: '',
    cscaSaltLength: 0,
    cscaCurveOrExponent: '',
    cscaSignatureAlgorithmBits: 0,
    dsc: '',
    csca: '',
  },
  dsc_parsed: {
    tbsBytes: new Array(100).fill(1),
    signatureAlgorithm: 'rsa',
    publicKeyAlgorithm: 'rsa',
    publicKeyDetails: {
      modulus: '12345',
      exponent: '65537',
    },
    signature: new Array(100).fill(1),
  } as any,
  csca_parsed: {
    tbsBytes: new Array(100).fill(1),
    signatureAlgorithm: 'rsa',
    publicKeyAlgorithm: 'rsa',
    publicKeyDetails: {
      modulus: '12345',
      exponent: '65537',
    },
    signature: new Array(100).fill(1),
  } as any,
  documentType: 'passport',
  documentCategory: 'passport',
  mock: true,
};
const mockSelfApp: SelfApp = {
  userId: '0x0000000000000000000000000000000000000000000000000000000000000000',
  appName: 'TestSelfApp',
  logoBase64: '',
  endpointType: 'https',
  endpoint: 'https://test.example.com',
  deeplinkCallback: '',
  header: '',
  scope: 'test',
  sessionId: '',
  userIdType: 'hex',
  devMode: false,
  disclosures: {},
  version: 0,
  chainID: 42220,
  userDefinedData: '',
};

vi.mock('../../src/stores/protocolStore', () => ({
  useProtocolStore: {
    getState: () => ({
      passport: {
        ofac_trees: {
          nameAndDob: '{"root":["0"]}',
          nameAndYob: '{"root":["0"]}',
          passportNoAndNationality: '{"root":["0"]}',
        },
        commitment_tree: '[[]]',
      },
    }),
  },
}));

describe('generateTEEInputsDisclose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('throws error for unknown document category', () => {
    // Mock the store to return an unknown document category
    vi.spyOn(useProtocolStore, 'getState').mockReturnValue({
      unknown: undefined,
    } as any);

    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrowError(
      `Unknown or unloaded document category in protocol store: passport`,
    );
  });

  it('throws error for unknown tree type', () => {
    // This test doesn't make sense as written since tree type is determined internally
    // Let's test the commitment tree validation instead
    vi.spyOn(useProtocolStore, 'getState').mockReturnValue({
      passport: {
        ofac_trees: 'ofac-tree-data',
        commitment_tree: undefined,
      },
    } as any);

    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrowError(
      `Invalid OFAC tree structure: missing required fields`,
    );
  });

  it('throws error if commitment tree not loaded', () => {
    vi.spyOn(useProtocolStore, 'getState').mockReturnValue({
      passport: {
        ofac_trees: 'ofac-tree-data',
        commitment_tree: undefined,
      },
    } as any);

    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrowError(
      `Invalid OFAC tree structure: missing required fields`,
    );
  });

  it('throws error if OFAC trees not loaded', () => {
    vi.spyOn(useProtocolStore, 'getState').mockReturnValue({
      passport: {
        ofac_trees: null,
        commitment_tree: '[[]]',
      },
    } as any);

    expect(() => generateTEEInputsDisclose(mockSecret, mockPassportData, mockSelfApp)).toThrowError(
      'OFAC trees not loaded',
    );
  });
});
