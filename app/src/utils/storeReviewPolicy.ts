// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

const DAY_MS = 24 * 60 * 60 * 1000;

// Apple hard-caps SKStoreReviewController at 3 prompts per 365 days and Google
// applies an undocumented quota; both silently swallow anything beyond that,
// so the local cap keeps every request we make count.
export const STORE_REVIEW_POLICY = {
  minSuccessfulProofsForFirstPrompt: 1,
  minSuccessfulProofsBetweenPrompts: 5,
  minMsBetweenPrompts: 90 * DAY_MS,
  maxPromptsPerRollingYear: 3,
  rollingYearMs: 365 * DAY_MS,
  failureCooldownMs: DAY_MS,
} as const;

export interface StoreReviewSnapshot {
  successfulProofCount: number;
  successfulProofCountAtLastPrompt: number;
  lastPromptAt: number | null;
  promptTimestamps: number[];
  lastFailureAt: number | null;
}

export type StoreReviewSkipReason =
  | 'not_enough_proofs'
  | 'prompt_cooldown'
  | 'yearly_cap'
  | 'recent_failure';

export type StoreReviewDecision =
  | { eligible: true }
  | { eligible: false; reason: StoreReviewSkipReason };

export function pruneStoreReviewPrompts(
  timestamps: number[],
  now: number,
): number[] {
  return timestamps.filter(
    timestamp => now - timestamp < STORE_REVIEW_POLICY.rollingYearMs,
  );
}

export function evaluateStoreReviewPrompt(
  snapshot: StoreReviewSnapshot,
  now: number,
): StoreReviewDecision {
  const {
    successfulProofCount,
    successfulProofCountAtLastPrompt,
    lastPromptAt,
    lastFailureAt,
  } = snapshot;

  const proofsSinceLastPrompt =
    lastPromptAt === null
      ? successfulProofCount
      : successfulProofCount - successfulProofCountAtLastPrompt;
  const requiredProofs =
    lastPromptAt === null
      ? STORE_REVIEW_POLICY.minSuccessfulProofsForFirstPrompt
      : STORE_REVIEW_POLICY.minSuccessfulProofsBetweenPrompts;
  if (proofsSinceLastPrompt < requiredProofs) {
    return { eligible: false, reason: 'not_enough_proofs' };
  }

  if (
    lastPromptAt !== null &&
    now - lastPromptAt < STORE_REVIEW_POLICY.minMsBetweenPrompts
  ) {
    return { eligible: false, reason: 'prompt_cooldown' };
  }

  if (
    pruneStoreReviewPrompts(snapshot.promptTimestamps, now).length >=
    STORE_REVIEW_POLICY.maxPromptsPerRollingYear
  ) {
    return { eligible: false, reason: 'yearly_cap' };
  }

  if (
    lastFailureAt !== null &&
    now - lastFailureAt < STORE_REVIEW_POLICY.failureCooldownMs
  ) {
    return { eligible: false, reason: 'recent_failure' };
  }

  return { eligible: true };
}
