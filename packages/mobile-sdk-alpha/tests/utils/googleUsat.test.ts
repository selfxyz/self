// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';

import {
  GOOGLE_USAT_FAUCET_APP_NAME,
  GOOGLE_USAT_FAUCET_ENDPOINT,
  GOOGLE_USAT_FAUCET_SCOPE,
} from '../../src/constants/googleUsat';
import { isGoogleUsatProofRequest } from '../../src/utils/googleUsat';

function buildApp(overrides: Partial<SelfApp> = {}): SelfApp {
  return {
    appName: GOOGLE_USAT_FAUCET_APP_NAME,
    logoBase64: '',
    scope: GOOGLE_USAT_FAUCET_SCOPE,
    endpoint: GOOGLE_USAT_FAUCET_ENDPOINT,
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
  it('matches when endpoint, scope, and appName all match the faucet identity', () => {
    expect(isGoogleUsatProofRequest(buildApp())).toBe(true);
  });

  it('returns false when appName differs', () => {
    expect(
      isGoogleUsatProofRequest(buildApp({ appName: 'Some Other App' })),
    ).toBe(false);
  });

  it('returns false when scope differs', () => {
    expect(
      isGoogleUsatProofRequest(buildApp({ scope: 'some-other-scope' })),
    ).toBe(false);
  });

  it('returns false when endpoint differs', () => {
    expect(
      isGoogleUsatProofRequest(
        buildApp({ endpoint: 'https://example.com/api/verify' }),
      ),
    ).toBe(false);
  });

  it('is case-insensitive on the endpoint host and tolerates surrounding whitespace', () => {
    const variant = ` ${GOOGLE_USAT_FAUCET_ENDPOINT.toUpperCase()} `;
    expect(isGoogleUsatProofRequest(buildApp({ endpoint: variant }))).toBe(
      true,
    );
  });

  it('requires exact scope match (case-sensitive)', () => {
    expect(
      isGoogleUsatProofRequest(
        buildApp({ scope: GOOGLE_USAT_FAUCET_SCOPE.toUpperCase() }),
      ),
    ).toBe(false);
  });

  it('requires exact appName match (case-sensitive)', () => {
    expect(
      isGoogleUsatProofRequest(
        buildApp({ appName: GOOGLE_USAT_FAUCET_APP_NAME.toUpperCase() }),
      ),
    ).toBe(false);
  });

  it('accepts a custom identity override', () => {
    const identity = {
      endpoint: 'https://override.example/api',
      scope: 'override-scope',
      appName: 'Override App',
    };
    expect(
      isGoogleUsatProofRequest(
        buildApp({
          endpoint: identity.endpoint,
          scope: identity.scope,
          appName: identity.appName,
        }),
        identity,
      ),
    ).toBe(true);
  });
});
