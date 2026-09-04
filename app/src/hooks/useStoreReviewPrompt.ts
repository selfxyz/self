// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { navigationRef } from '@/navigation';
import { requestStoreReviewIfEligible } from '@/services/storeReview';
import { useStoreReviewStore } from '@/stores/storeReviewStore';

export const STORE_REVIEW_PROMPT_ROUTE = 'Home';
// Lets the Home transition finish so the OS sheet lands on a settled screen.
export const STORE_REVIEW_PROMPT_DELAY_MS = 1200;

/**
 * Consumes a store-review prompt armed by a verified proof once the host
 * screen is focused and settled. Mount on the Home screen only.
 */
export function useStoreReviewPrompt() {
  const selfClient = useSelfClient();
  const promptArmed = useStoreReviewStore(state => state.promptArmed);

  useFocusEffect(
    useCallback(() => {
      if (!promptArmed) return;

      const timer = setTimeout(() => {
        // Another route (backup or update Modal) or a backgrounded app means
        // this is not a good moment; stay armed and retry on the next focus.
        if (AppState.currentState !== 'active') return;
        if (
          navigationRef.getCurrentRoute?.()?.name !== STORE_REVIEW_PROMPT_ROUTE
        ) {
          return;
        }
        useStoreReviewStore.getState().disarmPrompt();
        requestStoreReviewIfEligible(selfClient).catch(() => undefined);
      }, STORE_REVIEW_PROMPT_DELAY_MS);

      return () => clearTimeout(timer);
    }, [promptArmed, selfClient]),
  );
}
