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

/**
 * Per-onboarding-attempt state held in memory. The funnel distinguishes
 * `initialBranch` (the user's original intent, set once and immutable) from
 * `currentBranch` (the currently active branch, which `setOnboardingBranch`
 * can change when a user falls back from biometric to KYC mid-flow).
 *
 * Every canonical event is stamped with both so dashboards can answer
 * "who STARTED as biometric" and "who COMPLETED as biometric" separately —
 * see `SPEC.md` § Cross-branch flows.
 */
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

/**
 * Get-or-create the current attempt. When bootstrapping a fresh attempt (no
 * attempt was active), also emits `Onboarding: Started` as that attempt's
 * first event. This is the single source of truth for how STARTED fires —
 * every entry path into the onboarding flow converges on the first
 * canonical step event, which triggers this bootstrap exactly once per
 * attempt.
 */
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

/**
 * Capture a newly-supplied branch value from a step event. The first
 * non-'pending' value "locks in" `initialBranch` for the attempt; every
 * subsequent branch value updates `currentBranch` only. This preserves the
 * user's original intent even after a fallback.
 */
function captureBranch(attempt: OnboardingAttempt, branch: OnboardingBranch): void {
  if (attempt.initialBranch === 'pending' && branch !== 'pending') {
    attempt.initialBranch = branch;
  }
  attempt.currentBranch = branch;
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
 * measured from `startOnboardingAttempt`, plus `used_fallback` so dashboards
 * can cohort by "did the user change branches during this attempt."
 * Clears the attempt after firing so a subsequent registration starts a
 * fresh attempt. No-op if no attempt is active or `COMPLETED` was already
 * fired.
 */
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
    ...baseProperties(currentAttempt),
    duration_seconds: durationSeconds(currentAttempt.startedAt),
    country_code: currentAttempt.countryCode,
    document_type: currentAttempt.documentType,
    used_fallback: currentAttempt.initialBranch !== currentAttempt.currentBranch,
    ...properties,
  });

  currentAttempt = null;
}

/**
 * Fire the canonical failure event. Includes `stage`, `reason`, and
 * `used_fallback` for dashboard grouping. Clears the attempt. No-op if no
 * attempt is active.
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

  if (attempt.isMock) return;

  selfClient.trackEvent(OnboardingEvents.FAILED, {
    ...baseProperties(attempt),
    stage,
    reason,
    duration_seconds: durationSeconds(attempt.startedAt),
    used_fallback: attempt.initialBranch !== attempt.currentBranch,
    ...properties,
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
 * Update `currentBranch` for the active attempt (e.g. LogoConfirmation "No"
 * or RegistrationFallback "try different method" flips the flow to KYC).
 * Does NOT change `initialBranch` — the user's original intent is preserved.
 * No-op if no attempt is active.
 */
export function setOnboardingBranch(branch: OnboardingBranch): void {
  if (!currentAttempt) return;
  currentAttempt.currentBranch = branch;
}

export function trackBranchEvent(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!currentAttempt) return;
  selfClient.trackEvent(event, {
    ...baseProperties(currentAttempt),
    ...properties,
  });
}

/**
 * Fire a retry event for a given stage. Unlike step events, this is NOT
 * deduped — every retry produces an event. Increments the attempt's
 * per-stage retry counter so later `trackOnboardingStep` calls on the
 * success path can include `attempt_count`.
 */
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
 * `branch` in properties to update the attempt's current branch (and lock
 * in `initialBranch` on first non-'pending' value).
 *
 * If no attempt is active, this bootstraps one via `ensureAttempt`, which
 * also emits `Onboarding: Started` as the attempt's first event. This is
 * how STARTED fires across all entry paths — there are no other callers.
 */
export function trackOnboardingStep(
  selfClient: Pick<SelfClient, 'trackEvent'>,
  event: string,
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

  // Strip the caller-supplied `branch` — emitted event uses the richer
  // `initial_branch` / `current_branch` pair from `baseProperties`.
  const { branch: _discardedBranch, ...stampableProperties } = properties ?? {};

  selfClient.trackEvent(event, {
    ...baseProperties(attempt),
    ...stampableProperties,
  });
}
