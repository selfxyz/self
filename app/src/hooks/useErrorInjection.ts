// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';

import type { InjectedErrorType } from '@/stores/errorInjectionStore';
import { useErrorInjectionStore } from '@/stores/errorInjectionStore';
import { IS_DEV_MODE } from '@/utils/devUtils';

/**
 * Hook for checking if a specific error should be injected
 * Only active in dev mode
 */
export function useErrorInjection() {
  const injectedErrors = useErrorInjectionStore(state => state.injectedErrors);
  const clearError = useErrorInjectionStore(state => state.clearError);
  const clearOnTrigger = useErrorInjectionStore(state => state.clearOnTrigger);

  const shouldInjectError = useCallback(
    (errorType: InjectedErrorType): boolean => {
      if (!IS_DEV_MODE) return false;
      const shouldTrigger = injectedErrors.includes(errorType);
      if (shouldTrigger && clearOnTrigger) {
        clearError(errorType);
      }
      return shouldTrigger;
    },
    [injectedErrors, clearError, clearOnTrigger],
  );

  return { shouldInjectError };
}
