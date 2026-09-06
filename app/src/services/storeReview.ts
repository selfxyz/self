// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as StoreReview from 'expo-store-review';

import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import { AppEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { useStoreReviewStore } from '@/stores/storeReviewStore';
import {
  evaluateStoreReviewPrompt,
  type StoreReviewSkipReason,
} from '@/utils/storeReviewPolicy';

export type StoreReviewRequestOutcome =
  | { requested: true }
  | {
      requested: false;
      reason: StoreReviewSkipReason | 'unavailable' | 'error';
    };

/**
 * Asks the OS for its in-app rating sheet when the local policy allows it.
 * The OS decides whether the sheet is actually shown and never reports back,
 * so a request is recorded as a prompt before the native call is made.
 */
export async function requestStoreReviewIfEligible(
  client?: Pick<SelfClient, 'trackEvent'>,
  now: number = Date.now(),
): Promise<StoreReviewRequestOutcome> {
  const store = useStoreReviewStore.getState();
  const decision = evaluateStoreReviewPrompt(store, now);
  if (!decision.eligible) {
    return { requested: false, reason: decision.reason };
  }

  try {
    if (!(await StoreReview.isAvailableAsync())) {
      return { requested: false, reason: 'unavailable' };
    }
    store.recordPromptShown(now);
    await StoreReview.requestReview();
    client?.trackEvent(AppEvents.STORE_REVIEW_REQUESTED, {
      successful_proof_count: store.successfulProofCount,
      prompt_count: useStoreReviewStore.getState().promptTimestamps.length,
    });
    return { requested: true };
  } catch (error) {
    console.warn(
      'Store review request failed:',
      error instanceof Error ? error.message : String(error),
    );
    return { requested: false, reason: 'error' };
  }
}
