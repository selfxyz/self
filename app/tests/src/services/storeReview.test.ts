// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as StoreReview from 'expo-store-review';

import { AppEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { requestStoreReviewIfEligible } from '@/services/storeReview';
import { useStoreReviewStore } from '@/stores/storeReviewStore';

const mockIsAvailableAsync = StoreReview.isAvailableAsync as jest.Mock;
const mockRequestReview = StoreReview.requestReview as jest.Mock;

const NOW = Date.UTC(2026, 8, 4);

describe('requestStoreReviewIfEligible', () => {
  const trackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAvailableAsync.mockResolvedValue(true);
    mockRequestReview.mockResolvedValue(undefined);
    useStoreReviewStore.setState({
      successfulProofCount: 3,
      successfulProofCountAtLastPrompt: 0,
      lastPromptAt: null,
      promptTimestamps: [],
      lastFailureAt: null,
      lastCountedProofSessionId: null,
      promptArmed: false,
    });
  });

  it('requests the OS sheet, records the prompt and tracks it', async () => {
    const outcome = await requestStoreReviewIfEligible({ trackEvent }, NOW);

    expect(outcome).toEqual({ requested: true });
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
    expect(useStoreReviewStore.getState()).toMatchObject({
      lastPromptAt: NOW,
      successfulProofCountAtLastPrompt: 3,
      promptTimestamps: [NOW],
    });
    expect(trackEvent).toHaveBeenCalledWith(AppEvents.STORE_REVIEW_REQUESTED, {
      successful_proof_count: 3,
      prompt_count: 1,
    });
  });

  it('skips without touching the OS when the policy says no', async () => {
    useStoreReviewStore.setState({ successfulProofCount: 0 });

    const outcome = await requestStoreReviewIfEligible({ trackEvent }, NOW);

    expect(outcome).toEqual({ requested: false, reason: 'not_enough_proofs' });
    expect(mockIsAvailableAsync).not.toHaveBeenCalled();
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(useStoreReviewStore.getState().lastPromptAt).toBeNull();
  });

  it('skips and leaves the budget untouched when the store is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    const outcome = await requestStoreReviewIfEligible({ trackEvent }, NOW);

    expect(outcome).toEqual({ requested: false, reason: 'unavailable' });
    expect(mockRequestReview).not.toHaveBeenCalled();
    expect(useStoreReviewStore.getState().lastPromptAt).toBeNull();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('still counts the prompt when the native call throws', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockRequestReview.mockRejectedValue(new Error('native boom'));

    const outcome = await requestStoreReviewIfEligible({ trackEvent }, NOW);

    expect(outcome).toEqual({ requested: false, reason: 'error' });
    expect(useStoreReviewStore.getState().lastPromptAt).toBe(NOW);
    expect(trackEvent).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
