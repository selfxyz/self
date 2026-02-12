// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { sanitizeErrorMessage } from '@selfxyz/mobile-sdk-alpha';

import { fetchAccessToken, launchSumsub } from '@/integrations/sumsub';
import type { SumsubResult } from '@/integrations/sumsub/types';
import type { RootStackParamList } from '@/navigation';

export type FallbackErrorSource = 'mrz_scan_failed' | 'nfc_scan_failed';

export interface UseSumsubLauncherOptions {
  /**
   * Country code for the user's document
   */
  countryCode: string;
  /**
   * Error source to track where the Sumsub launch was initiated from
   */
  errorSource: FallbackErrorSource;
  /**
   * Optional callback to handle successful verification.
   * Receives the Sumsub result and the userId from the access token.
   * If not provided, defaults to navigating to KycSuccess with the userId.
   */
  onSuccess?: (result: SumsubResult, userId: string) => void | Promise<void>;
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
        const safeError = sanitizeErrorMessage(error);
        console.error('Sumsub verification failed:', safeError);

        // Call custom error handler if provided, otherwise navigate to fallback screen
        if (onError) {
          await onError(safeError, result);
        } else {
          // Navigate to the appropriate fallback screen based on error source
          if (errorSource === 'mrz_scan_failed') {
            navigation.navigate('RegistrationFallbackMRZ', { countryCode });
          } else {
            navigation.navigate('RegistrationFallbackNFC', { countryCode });
          }
        }
        return;
      }

      // Handle success - navigate to KycSuccess by default
      if (onSuccess) {
        await onSuccess(result, accessToken.userId);
      } else {
        navigation.navigate('KycSuccess', { userId: accessToken.userId });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const safeError = sanitizeErrorMessage(errorMessage);
      console.error('Error launching alternative verification:', safeError);

      // Call custom error handler if provided, otherwise navigate to fallback screen
      if (onError) {
        await onError(safeError);
      } else {
        // Navigate to the appropriate fallback screen based on error source
        if (errorSource === 'mrz_scan_failed') {
          navigation.navigate('RegistrationFallbackMRZ', { countryCode });
        } else {
          navigation.navigate('RegistrationFallbackNFC', { countryCode });
        }
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
