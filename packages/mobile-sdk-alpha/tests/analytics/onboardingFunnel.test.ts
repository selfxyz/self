// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  _getCurrentOnboardingAttempt,
  _resetOnboardingFunnelForTests,
  completeOnboardingAttempt,
  failOnboardingAttempt,
  resolveOnboardingBranch,
  setOnboardingBranch,
  startOnboardingAttempt,
  trackOnboardingRetry,
  trackOnboardingStep,
} from '../../src/analytics/onboardingFunnel';
import { OnboardingEvents } from '../../src/constants/analytics';

function makeClient() {
  return { trackEvent: vi.fn() };
}

beforeEach(() => {
  _resetOnboardingFunnelForTests();
});

describe('resolveOnboardingBranch', () => {
  it.each([
    ['p', 'biometric_passport'],
    ['passport', 'biometric_passport'],
    ['i', 'biometric_id'],
    ['id_card', 'biometric_id'],
    ['a', 'aadhaar'],
    ['aadhaar', 'aadhaar'],
    ['kyc', 'kyc'],
  ])('maps %s to %s', (input, expected) => {
    expect(resolveOnboardingBranch(input)).toBe(expected);
  });

  it('defaults unknown document types to kyc', () => {
    expect(resolveOnboardingBranch('mystery')).toBe('kyc');
  });
});

describe('startOnboardingAttempt', () => {
  it('emits the STARTED event with branch=pending and a new attempt_id', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    expect(client.trackEvent).toHaveBeenCalledTimes(1);
    const [name, props] = client.trackEvent.mock.calls[0];
    expect(name).toBe(OnboardingEvents.STARTED);
    expect(props.branch).toBe('pending');
    expect(props.attempt_id).toBeTruthy();
  });

  it('creates a fresh attempt on re-entry (abandons the prior one)', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    const firstId = _getCurrentOnboardingAttempt()?.id;

    startOnboardingAttempt(client);
    const secondId = _getCurrentOnboardingAttempt()?.id;

    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
  });
});

describe('trackOnboardingStep', () => {
  it('dedupes repeated calls for the same event (handles back-nav)', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });

    const countryCalls = client.trackEvent.mock.calls.filter(
      ([name]: string[]) => name === OnboardingEvents.COUNTRY_SELECTED,
    );
    expect(countryCalls).toHaveLength(1);
  });

  it('allows multiple distinct step events per attempt', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
      document_type: 'passport',
    });
    expect(client.trackEvent.mock.calls.map(c => c[0])).toEqual([
      OnboardingEvents.STARTED,
      OnboardingEvents.COUNTRY_SELECTED,
      OnboardingEvents.DOCUMENT_TYPE_SELECTED,
    ]);
  });

  it('stamps the attempt_id on every step event', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    const attemptId = _getCurrentOnboardingAttempt()?.id;
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });

    for (const call of client.trackEvent.mock.calls) {
      expect(call[1].attempt_id).toBe(attemptId);
    }
  });

  it('updates the attempt branch when a step event supplies branch', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    expect(_getCurrentOnboardingAttempt()?.branch).toBe('biometric_passport');
  });

  it('bootstraps an attempt if none is active (deep-link entry)', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    expect(_getCurrentOnboardingAttempt()).not.toBeNull();
  });
});

describe('setOnboardingBranch', () => {
  it('flips the branch on the current attempt (LogoConfirmation "No" → KYC)', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    setOnboardingBranch('kyc');
    trackOnboardingStep(client, OnboardingEvents.SCAN_STARTED, { branch: 'kyc' });

    const scanCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === OnboardingEvents.SCAN_STARTED);
    expect(scanCall?.[1].branch).toBe('kyc');
    expect(_getCurrentOnboardingAttempt()?.branch).toBe('kyc');
  });

  it('is a no-op when no attempt is active', () => {
    expect(() => setOnboardingBranch('kyc')).not.toThrow();
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });
});

describe('trackOnboardingRetry', () => {
  it('increments the retry count and fires an event each time', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    trackOnboardingRetry(client, 'scan_started', 'nfc_scan_failed');
    trackOnboardingRetry(client, 'scan_started', 'nfc_scan_failed');

    const retryCalls = client.trackEvent.mock.calls.filter(
      ([name]: string[]) => name === OnboardingEvents.STEP_RETRIED,
    );
    expect(retryCalls).toHaveLength(2);
    expect(retryCalls[0][1].attempt_count).toBe(1);
    expect(retryCalls[1][1].attempt_count).toBe(2);
  });
});

describe('completeOnboardingAttempt', () => {
  it('fires COMPLETED with duration_seconds and clears the attempt', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    completeOnboardingAttempt(client);

    const completedCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === OnboardingEvents.COMPLETED);
    expect(completedCall).toBeTruthy();
    expect(typeof completedCall![1].duration_seconds).toBe('number');
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });

  it('is a no-op when no attempt is active (prevents disclosure-later pollution)', () => {
    const client = makeClient();
    completeOnboardingAttempt(client);
    expect(client.trackEvent).not.toHaveBeenCalled();
  });

  it('is a no-op if COMPLETED was already fired (idempotent)', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    completeOnboardingAttempt(client);
    completeOnboardingAttempt(client);

    const completedCalls = client.trackEvent.mock.calls.filter(
      ([name]: string[]) => name === OnboardingEvents.COMPLETED,
    );
    expect(completedCalls).toHaveLength(1);
  });
});

describe('failOnboardingAttempt', () => {
  it('fires FAILED with stage/reason and clears the attempt', () => {
    const client = makeClient();
    startOnboardingAttempt(client);
    failOnboardingAttempt(client, 'scan_started', 'nfc_timeout', { recoverable: true });

    const failedCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === OnboardingEvents.FAILED);
    expect(failedCall?.[1]).toMatchObject({
      stage: 'scan_started',
      reason: 'nfc_timeout',
      recoverable: true,
    });
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });

  it('is a no-op when no attempt is active', () => {
    const client = makeClient();
    failOnboardingAttempt(client, 'scan_started', 'nfc_timeout');
    expect(client.trackEvent).not.toHaveBeenCalled();
  });
});
