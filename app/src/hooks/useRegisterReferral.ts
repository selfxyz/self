// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { ethers } from 'ethers';
import { useCallback, useState } from 'react';

import { recordReferralPointEvent } from '@/services/points';

export const useRegisterReferral = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerReferral = useCallback(async (referrer: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate referrer address format
      if (!ethers.isAddress(referrer)) {
        const errorMessage =
          'Invalid referrer address. Must be a valid hex address.';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }

      // recordReferralPointEvent handles both API registration and local event recording
      const result = await recordReferralPointEvent(referrer);
      if (result.success) {
        return { success: true };
      }
      const errorMessage = result.error || 'Failed to register referral';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    registerReferral,
    isLoading,
    error,
  };
};
