// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { fetchAccessToken, launchSumsub } from '@/integrations/sumsub';
import type { SumsubResult } from '@/integrations/sumsub/types';
import type { RootStackParamList } from '@/navigation';

export interface UseSumsubLauncherOptions {
  /**
   * Country code for the user's document
   */
  countryCode: string;
  /**
   * Error source to track where the Sumsub launch was initiated from
   */
  errorSource: 'sumsub_initialization' | string;
  /**
   * Optional callback to handle successful verification
   */
  onSuccess?: (result: SumsubResult) => void | Promise<void>;
  /**
   * Optional callback to handle user cancellation
   */
  onCancel?: () => void | Promise<void>;
  /**
   * Optional callback to handle verification failure
   */
  onError?: (error: unknown, result?: SumsubResult) => void | Promise<void>;
}

/**
 * Custom hook for launching Sumsub verification with consistent error handling.
 *
 * Abstracts the common pattern of:
 * 1. Fetching access token
 * 2. Launching Sumsub SDK
 * 3. Handling errors by navigating to fallback screen
 * 4. Managing loading state
 *
 * @example
 * ```tsx
 * const { launchSumsubVerification, isLoading } = useSumsubLauncher({
 *   countryCode: 'US',
 *   errorSource: 'nfc_scan_failed',
 * });
 *
 * <Button onPress={launchSumsubVerification} disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Try Alternative Verification'}
 * </Button>
 * ```
 */
export const useSumsubLauncher = (options: UseSumsubLauncherOptions) => {
  const { countryCode, errorSource, onSuccess, onCancel, onError } = options;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(false);

  const launchSumsubVerification = useCallback(async () => {
    setIsLoading(true);
    try {
      const accessToken = await fetchAccessToken();
      const result = await launchSumsub({ accessToken: accessToken.token });

      // Handle user cancellation
      if (!result.success && result.status === 'Interrupted') {
        await onCancel?.();
        return;
      }

      // Handle verification failure
      if (!result.success) {
        const error = result.errorMsg || result.errorType || 'Unknown error';
        console.error('Sumsub verification failed:', error);
        await onError?.(error, result);
        return;
      }

      // Handle success
      await onSuccess?.(result);
    } catch (error) {
      console.error('Error launching alternative verification:', error);

      // Call custom error handler if provided
      if (onError) {
        await onError(error);
      } else {
        // Default behavior: navigate to fallback screen
        navigation.navigate('VerificationFallback', {
          errorSource,
          countryCode,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigation, countryCode, errorSource, onSuccess, onCancel, onError]);

  return {
    launchSumsubVerification,
    isLoading,
  };
};
