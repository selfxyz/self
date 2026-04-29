// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  _getCurrentOnboardingAttempt,
  _resetOnboardingFunnelForTests,
  trackFallbackDecision,
} from '../../src/analytics/onboardingFunnel';
import { FallbackReason, FallbackStage, OnboardingEvents } from '../../src/constants/analytics';

function mockClient() {
  return { trackEvent: vi.fn() };
}

describe('trackFallbackDecision', () => {
  beforeEach(() => {
    _resetOnboardingFunnelForTests();
  });

  it('bootstraps an attempt and fires STARTED if none exists', () => {
    const client = mockClient();
    trackFallbackDecision(client, OnboardingEvents.FALLBACK_OFFERED, FallbackStage.MRZ_SCAN, FallbackReason.MRZ_SCAN_FAILED);

    expect(client.trackEvent).toHaveBeenCalledTimes(2);
    expect(client.trackEvent.mock.calls[0][0]).toBe(OnboardingEvents.STARTED);
    expect(client.trackEvent.mock.calls[1][0]).toBe(OnboardingEvents.FALLBACK_OFFERED);
  });

  it('stamps events with attempt_id, initial_branch, current_branch, from_stage, reason', () => {
    const client = mockClient();
    trackFallbackDecision(client, OnboardingEvents.FALLBACK_OFFERED, FallbackStage.NFC_SCAN, FallbackReason.NFC_SCAN_FAILED);

    const payload = client.trackEvent.mock.calls[1][1];
    expect(payload).toMatchObject({
      attempt_id: expect.any(String),
      initial_branch: 'pending',
      current_branch: 'pending',
      from_stage: 'nfc_scan',
      reason: 'nfc_scan_failed',
    });
  });

  it('is NOT deduped — repeated calls all fire', () => {
    const client = mockClient();
    trackFallbackDecision(client, OnboardingEvents.FALLBACK_OFFERED, FallbackStage.MRZ_SCAN, FallbackReason.USER_CANCELLED);
    trackFallbackDecision(client, OnboardingEvents.FALLBACK_OFFERED, FallbackStage.MRZ_SCAN, FallbackReason.USER_CANCELLED);
    trackFallbackDecision(client, OnboardingEvents.FALLBACK_OFFERED, FallbackStage.MRZ_SCAN, FallbackReason.USER_CANCELLED);

    // 1 STARTED + 3 FALLBACK_OFFERED
    expect(client.trackEvent).toHaveBeenCalledTimes(4);
    const fallbackCalls = client.trackEvent.mock.calls.filter(
      ([event]: [string]) => event === OnboardingEvents.FALLBACK_OFFERED,
    );
    expect(fallbackCalls).toHaveLength(3);
  });

  it('merges additional properties into the event payload', () => {
    const client = mockClient();
    trackFallbackDecision(
      client,
      OnboardingEvents.FALLBACK_ACCEPTED,
      FallbackStage.DOCUMENT_TYPE_SELECTED,
      FallbackReason.NO_BIOMETRIC_CHIP,
      { custom_key: 'value' },
    );

    const payload = client.trackEvent.mock.calls[1][1];
    expect(payload.custom_key).toBe('value');
    expect(payload.from_stage).toBe('document_type_selected');
    expect(payload.reason).toBe('no_biometric_chip');
  });

  it('shares the same attempt_id as canonical step events', () => {
    const client = mockClient();
    trackFallbackDecision(client, OnboardingEvents.FALLBACK_OFFERED, FallbackStage.MRZ_SCAN, FallbackReason.MRZ_SCAN_FAILED);

    const attempt = _getCurrentOnboardingAttempt();
    const fallbackPayload = client.trackEvent.mock.calls[1][1];
    expect(fallbackPayload.attempt_id).toBe(attempt?.id);
  });
});
