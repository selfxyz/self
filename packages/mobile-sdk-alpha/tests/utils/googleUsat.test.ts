// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';

import {
  CELO_MAINNET_CHAIN_ID,
  CELO_SEPOLIA_CHAIN_ID,
  GOOGLE_USAT_FAUCET_VERIFIERS,
  GOOGLE_USAT_MAINNET_VERIFIER,
  GOOGLE_USAT_SEPOLIA_VERIFIER,
} from '../../src/constants/googleUsat';
import { isGoogleUsatProofRequest } from '../../src/utils/googleUsat';

const MAINNET_ADDRESS = '0x0000000000000000000000000000000000000001';
const TESTNET_ADDRESS = '0x0000000000000000000000000000000000000002';

const testVerifiers: Readonly<Record<number, ReadonlySet<string>>> = {
  42220: new Set<string>([MAINNET_ADDRESS]),
  11142220: new Set<string>([TESTNET_ADDRESS]),
};

const emptyVerifiers: Readonly<Record<number, ReadonlySet<string>>> = {
  42220: new Set<string>([]),
  11142220: new Set<string>([]),
};

function buildApp(overrides: Partial<SelfApp>): SelfApp {
  return {
    appName: 'Test App',
    logoBase64: '',
    scope: 'test-scope',
    endpoint: MAINNET_ADDRESS,
    endpointType: 'celo',
    header: 'Test Header',
    userId: 'user-id',
    sessionId: 'session-id',
    disclosures: {},
    deeplinkCallback: '',
    userIdType: 'uuid',
    version: 2,
    userDefinedData: '',
    selfDefinedData: '',
    devMode: false,
    chainID: 42220,
    ...overrides,
  };
}

describe('isGoogleUsatProofRequest', () => {
  it('returns false for https endpointType', () => {
    const app = buildApp({
      endpointType: 'https',
      endpoint: `https://example.com/${MAINNET_ADDRESS}`,
    });

    expect(isGoogleUsatProofRequest(app, testVerifiers)).toBe(false);
  });

  it('returns false when celo address is not in the set', () => {
    const app = buildApp({ endpoint: '0x0000000000000000000000000000000000000011' });

    expect(isGoogleUsatProofRequest(app, testVerifiers)).toBe(false);
  });

  it('returns true when celo address is in mainnet set and chainID is 42220', () => {
    const app = buildApp({ endpointType: 'celo', endpoint: MAINNET_ADDRESS, chainID: 42220 });

    expect(isGoogleUsatProofRequest(app, testVerifiers)).toBe(true);
  });

  it('returns false for cross-chain mismatch', () => {
    const app = buildApp({ endpointType: 'celo', endpoint: MAINNET_ADDRESS, chainID: 11142220 });

    expect(isGoogleUsatProofRequest(app, testVerifiers)).toBe(false);
  });

  it('returns true when staging_celo address is in testnet set', () => {
    const app = buildApp({ endpointType: 'staging_celo', endpoint: TESTNET_ADDRESS, chainID: 11142220 });

    expect(isGoogleUsatProofRequest(app, testVerifiers)).toBe(true);
  });

  it('matches mixed-case addresses against lowercased entries', () => {
    const app = buildApp({ endpointType: 'celo', endpoint: MAINNET_ADDRESS.toUpperCase(), chainID: 42220 });

    expect(isGoogleUsatProofRequest(app, testVerifiers)).toBe(true);
  });

  it('returns false when both sets are empty', () => {
    const app = buildApp({ endpointType: 'celo', endpoint: MAINNET_ADDRESS, chainID: 42220 });

    expect(isGoogleUsatProofRequest(app, emptyVerifiers)).toBe(false);
  });

  it('returns false for unknown chainID', () => {
    const app = buildApp({ endpointType: 'celo', endpoint: MAINNET_ADDRESS, chainID: 1 });

    expect(isGoogleUsatProofRequest(app, testVerifiers)).toBe(false);
  });

  describe('with default GOOGLE_USAT_FAUCET_VERIFIERS', () => {
    it('matches the deployed mainnet verifier on Celo', () => {
      const app = buildApp({
        endpointType: 'celo',
        endpoint: GOOGLE_USAT_MAINNET_VERIFIER,
        chainID: CELO_MAINNET_CHAIN_ID,
      });

      expect(isGoogleUsatProofRequest(app)).toBe(true);
    });

    it('matches the deployed testnet verifier on Celo Sepolia', () => {
      const app = buildApp({
        endpointType: 'staging_celo',
        endpoint: GOOGLE_USAT_SEPOLIA_VERIFIER,
        chainID: CELO_SEPOLIA_CHAIN_ID,
      });

      expect(isGoogleUsatProofRequest(app)).toBe(true);
    });

    it('rejects testnet verifier address on mainnet chainID', () => {
      const app = buildApp({
        endpointType: 'celo',
        endpoint: GOOGLE_USAT_SEPOLIA_VERIFIER,
        chainID: CELO_MAINNET_CHAIN_ID,
      });

      expect(isGoogleUsatProofRequest(app)).toBe(false);
    });

    it('stores all verifier addresses lowercased', () => {
      for (const addresses of Object.values(GOOGLE_USAT_FAUCET_VERIFIERS)) {
        for (const address of addresses) {
          expect(address).toBe(address.toLowerCase());
        }
      }
    });
  });
});
