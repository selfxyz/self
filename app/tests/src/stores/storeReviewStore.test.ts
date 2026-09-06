// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useStoreReviewStore } from '@/stores/storeReviewStore';
import { STORE_REVIEW_POLICY } from '@/utils/storeReviewPolicy';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('useStoreReviewStore', () => {
  beforeEach(() => {
    useStoreReviewStore.setState({
      successfulProofCount: 0,
      successfulProofCountAtLastPrompt: 0,
      lastPromptAt: null,
      promptTimestamps: [],
      lastFailureAt: null,
      lastCountedProofSessionId: null,
      promptArmed: false,
    });
  });

  it('counts each proof session once', () => {
    const { recordProofSuccess } = useStoreReviewStore.getState();
    recordProofSuccess('session-a');
    recordProofSuccess('session-a');
    recordProofSuccess('session-b');

    expect(useStoreReviewStore.getState().successfulProofCount).toBe(2);
    expect(useStoreReviewStore.getState().lastCountedProofSessionId).toBe(
      'session-b',
    );
  });

  it('records failures and disarms any pending prompt', () => {
    useStoreReviewStore.getState().armPrompt();
    useStoreReviewStore.getState().recordProofFailure(1_000);

    expect(useStoreReviewStore.getState()).toMatchObject({
      lastFailureAt: 1_000,
      promptArmed: false,
    });
  });

  it('snapshots the proof count and prunes old prompts when a prompt is shown', () => {
    const now = Date.UTC(2026, 8, 4);
    const stale = now - STORE_REVIEW_POLICY.rollingYearMs - DAY_MS;
    const recent = now - 10 * DAY_MS;
    useStoreReviewStore.setState({
      successfulProofCount: 7,
      promptTimestamps: [stale, recent],
    });

    useStoreReviewStore.getState().recordPromptShown(now);

    expect(useStoreReviewStore.getState()).toMatchObject({
      lastPromptAt: now,
      successfulProofCountAtLastPrompt: 7,
      promptTimestamps: [recent, now],
    });
  });

  it('arms and disarms the prompt flag', () => {
    useStoreReviewStore.getState().armPrompt();
    expect(useStoreReviewStore.getState().promptArmed).toBe(true);
    useStoreReviewStore.getState().disarmPrompt();
    expect(useStoreReviewStore.getState().promptArmed).toBe(false);
  });

  it('does not persist the session-only prompt flag', () => {
    const persisted = useStoreReviewStore.persist.getOptions().partialize?.({
      ...useStoreReviewStore.getState(),
      promptArmed: true,
    }) as Record<string, unknown>;

    expect(persisted).not.toHaveProperty('promptArmed');
    expect(persisted).toHaveProperty('successfulProofCount');
  });
});
