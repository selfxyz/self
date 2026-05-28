// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { KnownEventName } from '../constants/analytics';
import { KycEvents, OnboardingEvents } from '../constants/analytics';
import type { SelfClient } from '../types/public';

export type OnboardingBranch = 'biometric_passport' | 'biometric_id' | 'kyc' | 'aadhaar' | 'pending';

export type OnboardingFailureStage = OnboardingStage | 'pre_start';

export type OnboardingStage =
  | 'started'
  | 'country_selected'
  | 'document_type_selected'
  | 'scan_started'
  | 'scan_succeeded'
  | 'proof_generation_started'
  | 'proof_generation_succeeded'
  | 'completed';

interface OnboardingAttempt {
  id: string;
  initialBranch: OnboardingBranch;
  currentBranch: OnboardingBranch;
  startedAt: number;
  firedSteps: Set<string>;
  retryCounts: Record<string, number>;
  countryCode?: string;
  documentType?: string;
  isMock: boolean;
}

let currentAttempt: OnboardingAttempt | null = null;

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureAttempt(selfClient: Pick<SelfClient, 'trackEvent'>): OnboardingAttempt {
  if (!currentAttempt) {
    currentAttempt = {
      id: uuid(),
      initialBranch: 'pending',
      currentBranch: 'pending',
      startedAt: Date.now(),
      firedSteps: new Set([OnboardingEvents.STARTED]),
      retryCounts: {},
      isMock: false,
    };
    selfClient.trackEvent(OnboardingEvents.STARTED, baseProperties(currentAttempt));
  }
  return currentAttempt;
}

function durationSeconds(from: number): number {
  return parseFloat(((Date.now() - from) / 1000).toFixed(2));
}

function baseProperties(attempt: OnboardingAttempt): Record<string, unknown> {
  return {
    attempt_id: attempt.id,
    initial_branch: attempt.initialBranch,
    current_branch: attempt.currentBranch,
  };
}

function captureBranch(attempt: OnboardingAttempt, branch: OnboardingBranch): void {
  if (attempt.initialBranch === 'pending' && branch !== 'pending') {
    attempt.initialBranch = branch;
  }
  attempt.currentBranch = branch;
}

export function _getCurrentOnboardingAttempt(): OnboardingAttempt | null {
  return currentAttempt;
}

export function _resetOnboardingFunnelForTests(): void {
  currentAttempt = null;
}

export function completeOnboardingAttempt(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  properties?: Record<string, unknown>,
): void {
  if (!currentAttempt) return;
  if (currentAttempt.firedSteps.has(OnboardingEvents.COMPLETED)) return;
  currentAttempt.firedSteps.add(OnboardingEvents.COMPLETED);

  if (currentAttempt.isMock) {
    currentAttempt = null;
    return;
  }

  selfClient.trackEvent(OnboardingEvents.COMPLETED, {
    ...properties,
    ...baseProperties(currentAttempt),
    duration_seconds: durationSeconds(currentAttempt.startedAt),
    country_code: currentAttempt.countryCode,
    document_type: currentAttempt.documentType,
    used_fallback: currentAttempt.initialBranch !== currentAttempt.currentBranch,
  });

  currentAttempt = null;
}

export function recoverOnboardingAttempt(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  properties?: Record<string, unknown>,
): void {
  if (!currentAttempt) return;
  if (currentAttempt.firedSteps.has(OnboardingEvents.RECOVERED)) return;
  currentAttempt.firedSteps.add(OnboardingEvents.RECOVERED);

  if (currentAttempt.isMock) {
    currentAttempt = null;
    return;
  }

  selfClient.trackEvent(OnboardingEvents.RECOVERED, {
    ...properties,
    ...baseProperties(currentAttempt),
    duration_seconds: durationSeconds(currentAttempt.startedAt),
    country_code: currentAttempt.countryCode,
    document_type: currentAttempt.documentType,
    used_fallback: currentAttempt.initialBranch !== currentAttempt.currentBranch,
  });

  currentAttempt = null;
}

export function failOnboardingAttempt(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  stage: OnboardingFailureStage,
  reason: string,
  properties?: Record<string, unknown>,
): void {
  if (!currentAttempt) return;
  const attempt = currentAttempt;
  currentAttempt = null;

  if (attempt.isMock) return;

  selfClient.trackEvent(OnboardingEvents.FAILED, {
    ...properties,
    ...baseProperties(attempt),
    stage,
    reason,
    duration_seconds: durationSeconds(attempt.startedAt),
    used_fallback: attempt.initialBranch !== attempt.currentBranch,
  });
}

export function markCurrentAttemptAsMock(_selfClient: Pick<SelfClient, 'trackEvent'>): void {
  if (currentAttempt) {
    currentAttempt.isMock = true;
    return;
  }
  currentAttempt = {
    id: uuid(),
    initialBranch: 'pending',
    currentBranch: 'pending',
    startedAt: Date.now(),
    firedSteps: new Set([OnboardingEvents.STARTED]),
    retryCounts: {},
    isMock: true,
  };
}

export function resolveOnboardingBranch(documentType: string): OnboardingBranch {
  switch (documentType) {
    case 'p':
    case 'passport':
      return 'biometric_passport';
    case 'i':
    case 'id_card':
      return 'biometric_id';
    case 'a':
    case 'aadhaar':
      return 'aadhaar';
    case 'kyc':
      return 'kyc';
    default:
      return 'kyc';
  }
}

export function setOnboardingBranch(branch: OnboardingBranch): void {
  if (!currentAttempt) return;
  currentAttempt.currentBranch = branch;
}

export function trackBranchEvent(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  event: KnownEventName,
  properties?: Record<string, unknown>,
): void {
  if (!currentAttempt) return;
  selfClient.trackEvent(event, {
    ...properties,
    ...baseProperties(currentAttempt),
  });
}

export function trackKycVerdict(selfClient: Pick<SelfClient, 'trackEvent'>, properties: Record<string, unknown>): void {
  if (currentAttempt?.isMock) return;
  selfClient.trackEvent(KycEvents.VERIFICATION_RESOLVED, {
    ...properties,
    ...(currentAttempt ? baseProperties(currentAttempt) : {}),
  });
}

export function incrementAttemptRetryCount(key: string): number {
  if (!currentAttempt) return 0;
  currentAttempt.retryCounts[key] = (currentAttempt.retryCounts[key] ?? 0) + 1;
  return currentAttempt.retryCounts[key];
}

export function trackOnboardingRetry(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  stage: OnboardingStage,
  reason: string,
  properties?: Record<string, unknown>,
): void {
  const attempt = ensureAttempt(selfClient);
  attempt.retryCounts[stage] = (attempt.retryCounts[stage] ?? 0) + 1;
  if (attempt.isMock) return;
  selfClient.trackEvent(OnboardingEvents.STEP_RETRIED, {
    ...properties,
    ...baseProperties(attempt),
    stage,
    reason,
    attempt_count: attempt.retryCounts[stage],
  });
}

export function trackOnboardingStep(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  event: KnownEventName,
  properties?: Record<string, unknown>,
): void {
  const attempt = ensureAttempt(selfClient);

  if (properties && typeof properties.branch === 'string') {
    captureBranch(attempt, properties.branch as OnboardingBranch);
  }
  if (properties && typeof properties.country_code === 'string') {
    attempt.countryCode = properties.country_code;
  }
  if (properties && typeof properties.document_type === 'string') {
    attempt.documentType = properties.document_type;
  }

  if (attempt.firedSteps.has(event)) return;
  attempt.firedSteps.add(event);

  if (attempt.isMock) return;

  const { branch: _discardedBranch, ...stampableProperties } = properties ?? {};

  selfClient.trackEvent(event, {
    ...stampableProperties,
    ...baseProperties(attempt),
  });
}
