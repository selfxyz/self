// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  evaluateStoreReviewPrompt,
  pruneStoreReviewPrompts,
  STORE_REVIEW_POLICY,
  type StoreReviewSnapshot,
} from '@/utils/storeReviewPolicy';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 4);

const snapshot = (
  overrides: Partial<StoreReviewSnapshot> = {},
): StoreReviewSnapshot => ({
  successfulProofCount: 0,
  successfulProofCountAtLastPrompt: 0,
  lastPromptAt: null,
  promptTimestamps: [],
  lastFailureAt: null,
  ...overrides,
});

describe('evaluateStoreReviewPrompt', () => {
  it('waits for the first-prompt proof threshold', () => {
    expect(
      evaluateStoreReviewPrompt(
        snapshot({
          successfulProofCount:
            STORE_REVIEW_POLICY.minSuccessfulProofsForFirstPrompt - 1,
        }),
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'not_enough_proofs' });

    expect(
      evaluateStoreReviewPrompt(
        snapshot({
          successfulProofCount:
            STORE_REVIEW_POLICY.minSuccessfulProofsForFirstPrompt,
        }),
        NOW,
      ),
    ).toEqual({ eligible: true });
  });

  it('requires more proofs between prompts than before the first one', () => {
    const lastPromptAt = NOW - 2 * STORE_REVIEW_POLICY.minMsBetweenPrompts;
    const base = snapshot({
      successfulProofCountAtLastPrompt: 2,
      lastPromptAt,
      promptTimestamps: [lastPromptAt],
    });

    expect(
      evaluateStoreReviewPrompt(
        {
          ...base,
          successfulProofCount:
            2 + STORE_REVIEW_POLICY.minSuccessfulProofsBetweenPrompts - 1,
        },
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'not_enough_proofs' });

    expect(
      evaluateStoreReviewPrompt(
        {
          ...base,
          successfulProofCount:
            2 + STORE_REVIEW_POLICY.minSuccessfulProofsBetweenPrompts,
        },
        NOW,
      ),
    ).toEqual({ eligible: true });
  });

  it('enforces the cooldown since the last prompt', () => {
    const lastPromptAt = NOW - STORE_REVIEW_POLICY.minMsBetweenPrompts + DAY_MS;
    expect(
      evaluateStoreReviewPrompt(
        snapshot({
          successfulProofCount: 20,
          successfulProofCountAtLastPrompt: 2,
          lastPromptAt,
          promptTimestamps: [lastPromptAt],
        }),
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'prompt_cooldown' });
  });

  it('caps prompts within a rolling year and forgets older ones', () => {
    const lastPromptAt = NOW - STORE_REVIEW_POLICY.minMsBetweenPrompts - DAY_MS;
    const recent = [NOW - 300 * DAY_MS, NOW - 200 * DAY_MS, lastPromptAt];
    const capped = snapshot({
      successfulProofCount: 20,
      successfulProofCountAtLastPrompt: 2,
      lastPromptAt,
      promptTimestamps: recent,
    });
    expect(evaluateStoreReviewPrompt(capped, NOW)).toEqual({
      eligible: false,
      reason: 'yearly_cap',
    });

    const aged = {
      ...capped,
      promptTimestamps: [NOW - 400 * DAY_MS, NOW - 200 * DAY_MS, lastPromptAt],
    };
    expect(evaluateStoreReviewPrompt(aged, NOW)).toEqual({ eligible: true });
  });

  it('holds back after a recent proof failure', () => {
    expect(
      evaluateStoreReviewPrompt(
        snapshot({
          successfulProofCount: 5,
          lastFailureAt: NOW - STORE_REVIEW_POLICY.failureCooldownMs / 2,
        }),
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'recent_failure' });

    expect(
      evaluateStoreReviewPrompt(
        snapshot({
          successfulProofCount: 5,
          lastFailureAt: NOW - STORE_REVIEW_POLICY.failureCooldownMs,
        }),
        NOW,
      ),
    ).toEqual({ eligible: true });
  });

  it('treats a clock that moved backwards as still cooling down', () => {
    const lastPromptAt = NOW + DAY_MS;
    expect(
      evaluateStoreReviewPrompt(
        snapshot({
          successfulProofCount: 20,
          successfulProofCountAtLastPrompt: 2,
          lastPromptAt,
          promptTimestamps: [lastPromptAt],
        }),
        NOW,
      ),
    ).toEqual({ eligible: false, reason: 'prompt_cooldown' });
  });
});

describe('pruneStoreReviewPrompts', () => {
  it('drops timestamps older than the rolling year', () => {
    const kept = NOW - STORE_REVIEW_POLICY.rollingYearMs + 1;
    const dropped = NOW - STORE_REVIEW_POLICY.rollingYearMs;
    expect(pruneStoreReviewPrompts([dropped, kept, NOW], NOW)).toEqual([
      kept,
      NOW,
    ]);
  });
});
