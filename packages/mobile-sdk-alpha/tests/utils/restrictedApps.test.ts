// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';
import type { DocumentCategory } from '@selfxyz/common/utils/types';

import { GOOGLE_USAT_FAUCET_POLICY, type RestrictedAppPolicy } from '../../src/constants/restrictedApps';
import {
  findRestrictedAppPolicy,
  hasEligibleAlternativeDocumentForPolicy,
  isDocumentEligibleForPolicy,
  isRestrictedAppProofRequest,
} from '../../src/utils/restrictedApps';

const policy: RestrictedAppPolicy = GOOGLE_USAT_FAUCET_POLICY;

function buildApp(overrides: Partial<SelfApp> = {}): SelfApp {
  return {
    appName: policy.match.appName,
    logoBase64: '',
    scope: policy.match.scope,
    endpoint: policy.match.endpoint,
    endpointType: 'celo',
    header: '',
    userId: 'u',
    sessionId: 's',
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

function buildDoc(category: DocumentCategory, mock = false) {
  return { data: { documentCategory: category, mock } };
}

describe('findRestrictedAppPolicy', () => {
  it('returns the policy when identity matches exactly', () => {
    expect(findRestrictedAppPolicy(buildApp())).toBe(policy);
  });

  it('normalizes endpoint whitespace and case on both sides', () => {
    expect(findRestrictedAppPolicy(buildApp({ endpoint: `  ${policy.match.endpoint.toUpperCase()}  ` }))).toBe(policy);
  });

  it('returns null when scope differs (scope is case-sensitive)', () => {
    expect(findRestrictedAppPolicy(buildApp({ scope: policy.match.scope.toUpperCase() }))).toBeNull();
  });

  it('returns null when appName differs (appName is case-sensitive)', () => {
    expect(findRestrictedAppPolicy(buildApp({ appName: 'Different App' }))).toBeNull();
  });

  it('accepts a custom registry override', () => {
    const overridePolicy: RestrictedAppPolicy = {
      id: 'override',
      match: { endpoint: 'https://x', scope: 's', appName: 'A' },
      allowedCategories: ['passport'],
      allowMock: false,
    };
    expect(
      findRestrictedAppPolicy(buildApp({ endpoint: 'https://x', scope: 's', appName: 'A' }), [overridePolicy]),
    ).toBe(overridePolicy);
  });
});

describe('isRestrictedAppProofRequest', () => {
  it('is true when a policy matches', () => {
    expect(isRestrictedAppProofRequest(buildApp())).toBe(true);
  });

  it('is false when no policy matches', () => {
    expect(isRestrictedAppProofRequest(buildApp({ appName: 'Nope' }))).toBe(false);
  });
});

describe('isDocumentEligibleForPolicy', () => {
  it('allows categories that are in allowedCategories', () => {
    expect(isDocumentEligibleForPolicy(policy, 'passport', false)).toBe(true);
    expect(isDocumentEligibleForPolicy(policy, 'id_card', false)).toBe(true);
    expect(isDocumentEligibleForPolicy(policy, 'aadhaar', false)).toBe(true);
  });

  it('rejects categories not in allowedCategories', () => {
    expect(isDocumentEligibleForPolicy(policy, 'kyc', false)).toBe(false);
  });

  it('rejects mock documents when allowMock is false', () => {
    expect(isDocumentEligibleForPolicy(policy, 'passport', true)).toBe(false);
  });

  it('accepts mock documents when allowMock is true', () => {
    const lenient: RestrictedAppPolicy = { ...policy, allowMock: true };
    expect(isDocumentEligibleForPolicy(lenient, 'passport', true)).toBe(true);
  });

  it('treats undefined mock flag as non-mock', () => {
    expect(isDocumentEligibleForPolicy(policy, 'passport', undefined)).toBe(true);
  });
});

describe('hasEligibleAlternativeDocumentForPolicy', () => {
  it('returns true when an alternative eligible doc exists', () => {
    expect(
      hasEligibleAlternativeDocumentForPolicy(
        policy,
        {
          selected: buildDoc('kyc'),
          alt: buildDoc('passport'),
        },
        'selected',
      ),
    ).toBe(true);
  });

  it('returns false when only ineligible alternatives exist', () => {
    expect(
      hasEligibleAlternativeDocumentForPolicy(
        policy,
        {
          selected: buildDoc('kyc'),
          alt: buildDoc('kyc'),
        },
        'selected',
      ),
    ).toBe(false);
  });

  it('excludes the named document from consideration', () => {
    expect(hasEligibleAlternativeDocumentForPolicy(policy, { selected: buildDoc('passport') }, 'selected')).toBe(false);
  });

  it('skips mock alternatives when allowMock is false', () => {
    expect(
      hasEligibleAlternativeDocumentForPolicy(
        policy,
        {
          selected: buildDoc('kyc'),
          alt: buildDoc('passport', true),
        },
        'selected',
      ),
    ).toBe(false);
  });

  it('returns false on empty doc map', () => {
    expect(hasEligibleAlternativeDocumentForPolicy(policy, {}, 'selected')).toBe(false);
  });
});
