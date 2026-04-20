// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { OnboardingEvents } from '../constants/analytics';
import type { SelfClient } from '../types/public';

// ---------------------------------------------------------------------------
// Types (alphabetical to satisfy sort-exports)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Internal state and helpers
// ---------------------------------------------------------------------------

interface OnboardingAttempt {
  id: string;
  branch: OnboardingBranch;
  startedAt: number;
  firedSteps: Set<string>;
  retryCounts: Record<string, number>;
  countryCode?: string;
  documentType?: string;
}

let currentAttempt: OnboardingAttempt | null = null;

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureAttempt(): OnboardingAttempt {
  if (!currentAttempt) {
    currentAttempt = {
      id: uuid(),
      branch: 'pending',
      startedAt: Date.now(),
      firedSteps: new Set(),
      retryCounts: {},
    };
  }
  return currentAttempt;
}

function durationSeconds(from: number): number {
  return parseFloat(((Date.now() - from) / 1000).toFixed(2));
}

function baseProperties(attempt: OnboardingAttempt): Record<string, unknown> {
  return {
    attempt_id: attempt.id,
    branch: attempt.branch,
  };
}

// ---------------------------------------------------------------------------
// Public API (exports in alphabetical order to satisfy sort-exports)
// ---------------------------------------------------------------------------

/**
 * Internal accessor — exposed for tests only.
 * @internal
 */
export function _getCurrentOnboardingAttempt(): OnboardingAttempt | null {
  return currentAttempt;
}

/**
 * Internal reset — exposed for tests only.
 * @internal
 */
export function _resetOnboardingFunnelForTests(): void {
  currentAttempt = null;
}

/**
 * Fire the canonical completion event. Includes total onboarding duration
 * measured from `startOnboardingAttempt`. Clears the attempt after firing so
 * a subsequent registration starts a fresh attempt. No-op if no attempt is
 * active or `COMPLETED` was already fired.
 */
export function completeOnboardingAttempt(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  properties?: Record<string, unknown>,
): void {
  if (!currentAttempt) return;
  if (currentAttempt.firedSteps.has(OnboardingEvents.COMPLETED)) return;
  currentAttempt.firedSteps.add(OnboardingEvents.COMPLETED);

  selfClient.trackEvent(OnboardingEvents.COMPLETED, {
    ...baseProperties(currentAttempt),
    duration_seconds: durationSeconds(currentAttempt.startedAt),
    country_code: currentAttempt.countryCode,
    document_type: currentAttempt.documentType,
    ...properties,
  });

  currentAttempt = null;
}

/**
 * Fire the canonical failure event. Includes `stage` and `reason` for
 * dashboard grouping. Clears the attempt. No-op if no attempt is active.
 */
export function failOnboardingAttempt(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  stage: OnboardingFailureStage,
  reason: string,
  properties?: Record<string, unknown>,
): void {
  if (!currentAttempt) return;
  const attempt = currentAttempt;
  currentAttempt = null;

  selfClient.trackEvent(OnboardingEvents.FAILED, {
    ...baseProperties(attempt),
    stage,
    reason,
    duration_seconds: durationSeconds(attempt.startedAt),
    ...properties,
  });
}

/**
 * Resolve the onboarding branch from a selected document type. Called at the
 * `document_type_selected` step; may be overridden later (e.g. when the user
 * answers "No" on LogoConfirmation and falls back to KYC).
 *
 * Accepts both short codes used in IDSelectionScreen ('p' | 'i' | 'a' |
 * 'kyc') and the full categories used elsewhere ('passport' | 'id_card' |
 * 'aadhaar' | 'kyc'). Unknown inputs default to 'kyc'.
 */
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

/**
 * Update the branch on the current attempt (e.g. when LogoConfirmation "No"
 * flips the flow from `biometric_passport` to `kyc`). No-op if no attempt is
 * active.
 */
export function setOnboardingBranch(branch: OnboardingBranch): void {
  if (!currentAttempt) return;
  currentAttempt.branch = branch;
}

/**
 * Reset the onboarding attempt. Fires `onboarding_started` and begins a new
 * attempt window. Subsequent `trackOnboardingStep` calls are deduped against
 * this attempt. Calling this while an attempt is already in progress
 * abandons the prior attempt silently.
 */
export function startOnboardingAttempt(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  properties?: Record<string, unknown>,
): string {
  currentAttempt = {
    id: uuid(),
    branch: 'pending',
    startedAt: Date.now(),
    firedSteps: new Set([OnboardingEvents.STARTED]),
    retryCounts: {},
  };
  selfClient.trackEvent(OnboardingEvents.STARTED, {
    ...baseProperties(currentAttempt),
    ...properties,
  });
  return currentAttempt.id;
}

/**
 * Fire a retry event for a given stage. Unlike step events, this is NOT
 * deduped — every retry produces an event. Increments the attempt's
 * per-stage retry counter so later `trackOnboardingStep` calls on the
 * success path can include `attempt_count`.
 */
export function trackOnboardingRetry(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  stage: OnboardingStage,
  reason: string,
  properties?: Record<string, unknown>,
): void {
  const attempt = ensureAttempt();
  attempt.retryCounts[stage] = (attempt.retryCounts[stage] ?? 0) + 1;
  selfClient.trackEvent(OnboardingEvents.STEP_RETRIED, {
    ...baseProperties(attempt),
    stage,
    reason,
    attempt_count: attempt.retryCounts[stage],
    ...properties,
  });
}

/**
 * Fire a canonical onboarding step event. Fires at most once per attempt per
 * event name; subsequent calls with the same event are no-ops. Pass a
 * `branch` in properties to update the attempt's branch as a side effect.
 *
 * If no attempt is active, this will bootstrap one — this handles cases where
 * a user enters the flow from a deep link and we never see the Disclaimer.
 */
export function trackOnboardingStep(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  event: string,
  properties?: Record<string, unknown>,
): void {
  const attempt = ensureAttempt();

  if (properties && typeof properties.branch === 'string') {
    attempt.branch = properties.branch as OnboardingBranch;
  }
  if (properties && typeof properties.country_code === 'string') {
    attempt.countryCode = properties.country_code;
  }
  if (properties && typeof properties.document_type === 'string') {
    attempt.documentType = properties.document_type;
  }

  if (attempt.firedSteps.has(event)) return;
  attempt.firedSteps.add(event);

  selfClient.trackEvent(event, {
    ...baseProperties(attempt),
    ...properties,
  });
}
