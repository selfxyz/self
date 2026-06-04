// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as Sentry from '@sentry/react-native';

import {
  clearOnboardingTags,
  setOnboardingTags,
  tagsFromAnalyticsEvent,
} from '@/observability/onboardingContext';

const setTagMock = Sentry.setTag as jest.Mock;

describe('setOnboardingTags', () => {
  beforeEach(() => {
    setTagMock.mockClear();
  });

  it('sets tags for every populated key', () => {
    setOnboardingTags({
      attempt_id: 'abc123',
      initial_branch: 'biometric_passport',
      current_branch: 'biometric_passport',
      document_country: 'DEU',
      document_type: 'passport',
      signature_algorithm: 'rsa-pss-sha256',
      csca_hash_algorithm: 'sha256',
      kyc_provider: 'didit',
    });

    expect(setTagMock).toHaveBeenCalledWith('attempt_id', 'abc123');
    expect(setTagMock).toHaveBeenCalledWith(
      'initial_branch',
      'biometric_passport',
    );
    expect(setTagMock).toHaveBeenCalledWith(
      'current_branch',
      'biometric_passport',
    );
    expect(setTagMock).toHaveBeenCalledWith('document_country', 'DEU');
    expect(setTagMock).toHaveBeenCalledWith('document_type', 'passport');
    expect(setTagMock).toHaveBeenCalledWith(
      'signature_algorithm',
      'rsa-pss-sha256',
    );
    expect(setTagMock).toHaveBeenCalledWith('csca_hash_algorithm', 'sha256');
    expect(setTagMock).toHaveBeenCalledWith('kyc_provider', 'didit');
  });

  it('skips undefined and empty-string values', () => {
    setOnboardingTags({
      attempt_id: 'abc',
      initial_branch: '',
      current_branch: undefined,
    });

    expect(setTagMock).toHaveBeenCalledTimes(1);
    expect(setTagMock).toHaveBeenCalledWith('attempt_id', 'abc');
  });

  it('sanitizes values via sentry sanitizeTagValue (HTML-escape, control-strip)', () => {
    setOnboardingTags({ attempt_id: '<script>alert(1)</script>' });

    expect(setTagMock).toHaveBeenCalledTimes(1);
    const [, value] = setTagMock.mock.calls[0];
    expect(value).not.toContain('<script>');
    expect(value).toContain('&lt;');
  });
});

describe('clearOnboardingTags', () => {
  beforeEach(() => {
    setTagMock.mockClear();
  });

  it('clears every cohort tag key', () => {
    clearOnboardingTags();

    const cleared = setTagMock.mock.calls.map(([key]) => key);
    expect(cleared).toEqual(
      expect.arrayContaining([
        'attempt_id',
        'initial_branch',
        'current_branch',
        'document_country',
        'document_type',
        'signature_algorithm',
        'csca_hash_algorithm',
        'kyc_provider',
      ]),
    );
    for (const [, value] of setTagMock.mock.calls) {
      expect(value).toBeUndefined();
    }
  });
});

describe('tagsFromAnalyticsEvent', () => {
  it('returns empty for non-onboarding events', () => {
    expect(
      tagsFromAnalyticsEvent('Some Other: Event', {
        attempt_id: 'abc',
      }),
    ).toEqual({});
  });

  it('returns empty when properties are missing', () => {
    expect(
      tagsFromAnalyticsEvent('Onboarding: Country Selected', undefined),
    ).toEqual({});
  });

  it('extracts canonical funnel properties', () => {
    expect(
      tagsFromAnalyticsEvent('Onboarding: Country Selected', {
        attempt_id: 'abc',
        initial_branch: 'pending',
        current_branch: 'pending',
        country_code: 'FRA',
      }),
    ).toEqual({
      attempt_id: 'abc',
      initial_branch: 'pending',
      current_branch: 'pending',
      document_country: 'FRA',
    });
  });

  it('maps signature_algorithm and csca_hash_algorithm on biometric events', () => {
    expect(
      tagsFromAnalyticsEvent('Biometric: Document Parsed', {
        attempt_id: 'a',
        initial_branch: 'biometric_passport',
        current_branch: 'biometric_passport',
        document_type: 'passport',
        signature_algorithm: 'ecdsa-sha256',
        csca_hash_algorithm: 'sha384',
      }),
    ).toEqual({
      attempt_id: 'a',
      initial_branch: 'biometric_passport',
      current_branch: 'biometric_passport',
      document_type: 'passport',
      signature_algorithm: 'ecdsa-sha256',
      csca_hash_algorithm: 'sha384',
    });
  });

  it('only maps `provider` to kyc_provider on KYC: events', () => {
    expect(
      tagsFromAnalyticsEvent('KYC: Session Created', {
        attempt_id: 'a',
        provider: 'didit',
      }),
    ).toMatchObject({ kyc_provider: 'didit' });

    expect(
      tagsFromAnalyticsEvent('Onboarding: Country Selected', {
        attempt_id: 'a',
        provider: 'didit',
      }),
    ).not.toHaveProperty('kyc_provider');
  });
});
