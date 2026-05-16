// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  _getCurrentOnboardingAttempt,
  _resetOnboardingFunnelForTests,
  completeOnboardingAttempt,
  failOnboardingAttempt,
  incrementAttemptRetryCount,
  resolveOnboardingBranch,
  setOnboardingBranch,
  trackBranchEvent,
  trackOnboardingRetry,
  trackOnboardingStep,
} from '../../src/analytics/onboardingFunnel';
import { BiometricEvents, OnboardingEvents } from '../../src/constants/analytics';

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

describe('bootstrap on first canonical step (STARTED emission)', () => {
  it('fires Onboarding: Started as the first event when bootstrapping from trackOnboardingStep', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });

    expect(client.trackEvent.mock.calls[0][0]).toBe(OnboardingEvents.STARTED);
    expect(client.trackEvent.mock.calls[0][1].initial_branch).toBe('pending');
    expect(client.trackEvent.mock.calls[0][1].current_branch).toBe('pending');
    expect(client.trackEvent.mock.calls[0][1].attempt_id).toBeTruthy();
    expect(client.trackEvent.mock.calls[1][0]).toBe(OnboardingEvents.COUNTRY_SELECTED);
  });

  it('fires Onboarding: Started when bootstrapping from trackOnboardingRetry (e.g. deep-link into a retry screen)', () => {
    const client = makeClient();
    trackOnboardingRetry(client, 'scan_started', 'nfc_scan_failed');

    expect(client.trackEvent.mock.calls[0][0]).toBe(OnboardingEvents.STARTED);
    expect(client.trackEvent.mock.calls[1][0]).toBe(OnboardingEvents.STEP_RETRIED);
  });

  it('does NOT re-fire STARTED on subsequent step events within the same attempt', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    trackOnboardingStep(client, OnboardingEvents.SCAN_STARTED, { branch: 'biometric_passport' });

    const startedCalls = client.trackEvent.mock.calls.filter(([name]: string[]) => name === OnboardingEvents.STARTED);
    expect(startedCalls).toHaveLength(1);
  });

  it('fires STARTED again for a new attempt after the previous one completed', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    completeOnboardingAttempt(client);
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'DE' });

    const startedCalls = client.trackEvent.mock.calls.filter(([name]: string[]) => name === OnboardingEvents.STARTED);
    expect(startedCalls).toHaveLength(2);
    expect(startedCalls[0][1].attempt_id).not.toBe(startedCalls[1][1].attempt_id);
  });
});

describe('trackOnboardingStep', () => {
  it('dedupes repeated calls for the same event (handles back-nav)', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });

    const countryCalls = client.trackEvent.mock.calls.filter(
      ([name]: string[]) => name === OnboardingEvents.COUNTRY_SELECTED,
    );
    expect(countryCalls).toHaveLength(1);
  });

  it('fires distinct step events in order (STARTED bootstraps first)', () => {
    const client = makeClient();
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

  it('stamps attempt_id, initial_branch, current_branch on every step event', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    const attemptId = _getCurrentOnboardingAttempt()?.id;

    for (const call of client.trackEvent.mock.calls) {
      expect(call[1].attempt_id).toBe(attemptId);
      expect(call[1]).toHaveProperty('initial_branch');
      expect(call[1]).toHaveProperty('current_branch');
    }
  });

  it('locks initial_branch on first non-pending branch and mirrors current_branch', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    expect(_getCurrentOnboardingAttempt()?.initialBranch).toBe('biometric_passport');
    expect(_getCurrentOnboardingAttempt()?.currentBranch).toBe('biometric_passport');
  });

  it('strips the caller-supplied `branch` sugar from emitted properties', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    const docTypeCall = client.trackEvent.mock.calls.find(
      ([name]: string[]) => name === OnboardingEvents.DOCUMENT_TYPE_SELECTED,
    );
    expect(docTypeCall?.[1]).not.toHaveProperty('branch');
    expect(docTypeCall?.[1].initial_branch).toBe('biometric_passport');
    expect(docTypeCall?.[1].current_branch).toBe('biometric_passport');
  });
});

describe('setOnboardingBranch (fallback flow)', () => {
  it('changes current_branch but preserves initial_branch', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    setOnboardingBranch('kyc');

    expect(_getCurrentOnboardingAttempt()?.initialBranch).toBe('biometric_passport');
    expect(_getCurrentOnboardingAttempt()?.currentBranch).toBe('kyc');
  });

  it('post-fallback step events carry initial=biometric, current=kyc', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    setOnboardingBranch('kyc');
    trackOnboardingStep(client, OnboardingEvents.SCAN_SUCCEEDED, { branch: 'kyc' });

    const scanCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === OnboardingEvents.SCAN_SUCCEEDED);
    expect(scanCall?.[1].initial_branch).toBe('biometric_passport');
    expect(scanCall?.[1].current_branch).toBe('kyc');
  });

  it('is a no-op when no attempt is active', () => {
    expect(() => setOnboardingBranch('kyc')).not.toThrow();
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });
});

describe('trackOnboardingRetry', () => {
  it('increments the retry count and fires an event each time', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
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

describe('incrementAttemptRetryCount', () => {
  it('returns increasing counts across calls within the same attempt', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });

    expect(incrementAttemptRetryCount('kyc')).toBe(1);
    expect(incrementAttemptRetryCount('kyc')).toBe(2);
    expect(incrementAttemptRetryCount('kyc')).toBe(3);
  });

  it('tracks counters per key independently', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });

    expect(incrementAttemptRetryCount('kyc')).toBe(1);
    expect(incrementAttemptRetryCount('biometric')).toBe(1);
    expect(incrementAttemptRetryCount('kyc')).toBe(2);
  });

  it('returns 0 when no attempt is active', () => {
    expect(incrementAttemptRetryCount('kyc')).toBe(0);
  });
});

describe('completeOnboardingAttempt', () => {
  it('fires COMPLETED with duration_seconds, used_fallback=false, and clears the attempt', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    completeOnboardingAttempt(client);

    const completedCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === OnboardingEvents.COMPLETED);
    expect(completedCall).toBeTruthy();
    expect(typeof completedCall![1].duration_seconds).toBe('number');
    expect(completedCall![1].used_fallback).toBe(false);
    expect(completedCall![1].initial_branch).toBe('biometric_passport');
    expect(completedCall![1].current_branch).toBe('biometric_passport');
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });

  it('fires COMPLETED with used_fallback=true when branches diverge', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    setOnboardingBranch('kyc');
    completeOnboardingAttempt(client);

    const completedCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === OnboardingEvents.COMPLETED);
    expect(completedCall![1].used_fallback).toBe(true);
    expect(completedCall![1].initial_branch).toBe('biometric_passport');
    expect(completedCall![1].current_branch).toBe('kyc');
  });

  it('is a no-op when no attempt is active (prevents disclosure-later pollution)', () => {
    const client = makeClient();
    completeOnboardingAttempt(client);
    expect(client.trackEvent).not.toHaveBeenCalled();
  });

  it('is a no-op if COMPLETED was already fired (idempotent)', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.COUNTRY_SELECTED, { country_code: 'FR' });
    completeOnboardingAttempt(client);
    completeOnboardingAttempt(client);

    const completedCalls = client.trackEvent.mock.calls.filter(
      ([name]: string[]) => name === OnboardingEvents.COMPLETED,
    );
    expect(completedCalls).toHaveLength(1);
  });
});

describe('trackBranchEvent', () => {
  it('stamps attempt_id, initial_branch, current_branch on emitted properties', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    const attemptId = _getCurrentOnboardingAttempt()?.id;

    trackBranchEvent(client, BiometricEvents.MRZ_CAPTURED, {
      document_type: 'passport',
      duration_seconds: 1.23,
    });

    const branchCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === BiometricEvents.MRZ_CAPTURED);
    expect(branchCall?.[1]).toMatchObject({
      attempt_id: attemptId,
      initial_branch: 'biometric_passport',
      current_branch: 'biometric_passport',
      document_type: 'passport',
      duration_seconds: 1.23,
    });
  });

  it('no-ops silently when no attempt is active (no disclosure pollution)', () => {
    const client = makeClient();
    trackBranchEvent(client, BiometricEvents.MRZ_CAPTURED, { document_type: 'passport' });

    expect(client.trackEvent).not.toHaveBeenCalled();
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });

  it('does NOT bootstrap a new attempt (unlike trackOnboardingStep)', () => {
    const client = makeClient();
    trackBranchEvent(client, BiometricEvents.NFC_STARTED, { document_type: 'passport' });

    expect(client.trackEvent).not.toHaveBeenCalledWith(OnboardingEvents.STARTED, expect.anything());
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });

  it('does NOT dedupe — repeated calls emit the event each time (e.g. OCR retries)', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    trackBranchEvent(client, BiometricEvents.MRZ_STARTED, { document_type: 'passport' });
    trackBranchEvent(client, BiometricEvents.MRZ_STARTED, { document_type: 'passport' });
    trackBranchEvent(client, BiometricEvents.MRZ_STARTED, { document_type: 'passport' });

    const captureCalls = client.trackEvent.mock.calls.filter(
      ([name]: string[]) => name === BiometricEvents.MRZ_STARTED,
    );
    expect(captureCalls).toHaveLength(3);
  });

  it('reflects current_branch after a fallback (initial preserved)', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    setOnboardingBranch('kyc');

    trackBranchEvent(client, 'KYC: Session Requested', { provider: 'didit' });

    const kycCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === 'KYC: Session Requested');
    expect(kycCall?.[1]).toMatchObject({
      initial_branch: 'biometric_passport',
      current_branch: 'kyc',
      provider: 'didit',
    });
  });
});

describe('failOnboardingAttempt', () => {
  it('fires FAILED with stage/reason/used_fallback and clears the attempt', () => {
    const client = makeClient();
    trackOnboardingStep(client, OnboardingEvents.DOCUMENT_TYPE_SELECTED, {
      branch: 'biometric_passport',
    });
    setOnboardingBranch('kyc');
    failOnboardingAttempt(client, 'scan_started', 'kyc_provider_error', { recoverable: true });

    const failedCall = client.trackEvent.mock.calls.find(([name]: string[]) => name === OnboardingEvents.FAILED);
    expect(failedCall?.[1]).toMatchObject({
      stage: 'scan_started',
      reason: 'kyc_provider_error',
      recoverable: true,
      initial_branch: 'biometric_passport',
      current_branch: 'kyc',
      used_fallback: true,
    });
    expect(_getCurrentOnboardingAttempt()).toBeNull();
  });

  it('is a no-op when no attempt is active', () => {
    const client = makeClient();
    failOnboardingAttempt(client, 'scan_started', 'nfc_timeout');
    expect(client.trackEvent).not.toHaveBeenCalled();
  });
});
