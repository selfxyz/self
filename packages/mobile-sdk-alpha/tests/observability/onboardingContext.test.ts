// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { describe, expect, it } from 'vitest';

import {
  COHORT_TAG_KEYS,
  REDACTED,
  redactSensitiveFields,
  sanitizeTagValue,
  SENSITIVE_KEY_PATTERN,
  tagsFromAnalyticsEvent,
} from '../../src/observability/onboardingContext';

describe('tagsFromAnalyticsEvent', () => {
  it('returns empty for non-onboarding events', () => {
    expect(tagsFromAnalyticsEvent('Some Other: Event', { attempt_id: 'abc' })).toEqual({});
  });

  it('returns empty when properties are missing', () => {
    expect(tagsFromAnalyticsEvent('Onboarding: Country Selected', undefined)).toEqual({});
  });

  it('extracts canonical funnel properties (country_code → document_country)', () => {
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
        document_type: 'passport',
        signature_algorithm: 'ecdsa-sha256',
        csca_hash_algorithm: 'sha384',
      }),
    ).toMatchObject({
      document_type: 'passport',
      signature_algorithm: 'ecdsa-sha256',
      csca_hash_algorithm: 'sha384',
    });
  });

  it('only maps provider to kyc_provider on KYC: events', () => {
    expect(tagsFromAnalyticsEvent('KYC: Session Created', { provider: 'didit' })).toMatchObject({
      kyc_provider: 'didit',
    });
    expect(
      tagsFromAnalyticsEvent('Onboarding: Country Selected', { provider: 'didit', attempt_id: 'a' }),
    ).not.toHaveProperty('kyc_provider');
  });

  it('ignores non-string property values', () => {
    expect(tagsFromAnalyticsEvent('Onboarding: Country Selected', { country_code: 42 })).toEqual({});
  });
});

describe('sanitizeTagValue', () => {
  it('returns empty string for null/undefined', () => {
    expect(sanitizeTagValue(null)).toBe('');
    expect(sanitizeTagValue(undefined)).toBe('');
  });

  it('HTML-escapes angle brackets and quotes', () => {
    const out = sanitizeTagValue('<script>alert("x")</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;');
    expect(out).toContain('&gt;');
    expect(out).toContain('&quot;');
  });

  it('strips non-printable / non-ASCII control characters', () => {
    expect(sanitizeTagValue('hello\u0000\u200bworld')).toBe('helloworld');
  });

  it('truncates values longer than 200 characters', () => {
    const out = sanitizeTagValue('a'.repeat(250));
    expect(out.endsWith('...')).toBe(true);
    expect(out.length).toBe(200);
  });

  it('keeps escaped values within the 200-char Sentry tag limit', () => {
    const out = sanitizeTagValue('<'.repeat(250));
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith('...')).toBe(true);
  });
});

describe('SENSITIVE_KEY_PATTERN (ANA-13 live regex)', () => {
  const sensitive = [
    'passport',
    'passportNumber',
    'mrz',
    'mrzString',
    'dg1',
    'dg2',
    'chip',
    'aadhaar',
    'firstName',
    'first_name',
    'last_name',
    'fullName',
    'givenName',
    'family_name',
    'holderName',
    'surname',
    'name_of_holder',
    'dateOfBirth',
    'date_of_birth',
    'dob',
    'birthDate',
    'photo',
    'email',
    'contact_email',
    'userEmail',
  ];
  it.each(sensitive)('matches sensitive key %s', key => {
    expect(SENSITIVE_KEY_PATTERN.test(key)).toBe(true);
  });

  const safe = ['attempt_id', 'document_country', 'signature_algorithm', 'current_branch', 'kyc_provider'];
  it.each(safe)('does not match safe cohort key %s', key => {
    expect(SENSITIVE_KEY_PATTERN.test(key)).toBe(false);
  });
});

describe('redactSensitiveFields', () => {
  it('redacts PII-keyed fields in breadcrumbs, contexts, and extra', () => {
    const event = redactSensitiveFields({
      breadcrumbs: [{ data: { passportNumber: 'X123', safe: 'ok' } }],
      contexts: { doc: { date_of_birth: '1990-01-01', country: 'DEU' } },
      extra: { mrz: 'P<DEU...', attempt_id: 'a1' },
    });

    expect(event.breadcrumbs![0].data!.passportNumber).toBe(REDACTED);
    expect(event.breadcrumbs![0].data!.safe).toBe('ok');
    expect((event.contexts!.doc as Record<string, unknown>).date_of_birth).toBe(REDACTED);
    expect((event.contexts!.doc as Record<string, unknown>).country).toBe('DEU');
    expect(event.extra!.mrz).toBe(REDACTED);
    expect(event.extra!.attempt_id).toBe('a1');
  });

  it('recurses into nested objects', () => {
    const event = redactSensitiveFields({
      extra: { nested: { holderName: 'Jane Doe', id: 7 } },
    });
    expect((event.extra!.nested as Record<string, unknown>).holderName).toBe(REDACTED);
    expect((event.extra!.nested as Record<string, unknown>).id).toBe(7);
  });

  it('redacts user.email but keeps non-PII user fields', () => {
    const event = redactSensitiveFields({
      user: { id: 'u1', email: 'jane@example.com' },
    });
    expect((event.user as Record<string, unknown>).email).toBe(REDACTED);
    expect((event.user as Record<string, unknown>).id).toBe('u1');
  });

  it('redacts feedback contact_email in contexts', () => {
    const event = redactSensitiveFields({
      contexts: { feedback: { contact_email: 'jane@example.com', message: 'hi' } },
    });
    expect((event.contexts!.feedback as Record<string, unknown>).contact_email).toBe(REDACTED);
    expect((event.contexts!.feedback as Record<string, unknown>).message).toBe('hi');
  });

  it('strips query strings from request.url and drops query_string/cookies/headers', () => {
    const event = redactSensitiveFields({
      request: {
        url: 'https://app.self.xyz/verify?session=secret&token=abc',
        query_string: 'session=secret',
        cookies: { sid: 'secret' },
        headers: { Referer: 'https://app.self.xyz/verify?session=secret' },
      },
    });
    expect((event.request as Record<string, unknown>).url).toBe('https://app.self.xyz/verify');
    expect((event.request as Record<string, unknown>).query_string).toBeUndefined();
    expect((event.request as Record<string, unknown>).cookies).toBeUndefined();
    expect((event.request as Record<string, unknown>).headers).toBeUndefined();
  });

  it('strips query strings from breadcrumb url/to/from fields', () => {
    const event = redactSensitiveFields({
      breadcrumbs: [{ data: { from: '/a?token=x', to: '/b#frag', url: 'https://x.io/p?q=1' } }],
    });
    const data = event.breadcrumbs![0].data!;
    expect(data.from).toBe('/a');
    expect(data.to).toBe('/b');
    expect(data.url).toBe('https://x.io/p');
  });

  it('does not throw on an empty event', () => {
    expect(() => redactSensitiveFields({})).not.toThrow();
  });
});

describe('COHORT_TAG_KEYS', () => {
  it('lists the eight ANA-13 cohort tag keys', () => {
    expect(COHORT_TAG_KEYS).toEqual([
      'attempt_id',
      'initial_branch',
      'current_branch',
      'document_country',
      'document_type',
      'signature_algorithm',
      'csca_hash_algorithm',
      'kyc_provider',
    ]);
  });
});
