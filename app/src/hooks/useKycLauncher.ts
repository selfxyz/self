// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { sanitizeErrorMessage } from '@selfxyz/mobile-sdk-alpha';

import {
  createKycSession,
  launchKycVerification as startKycVerification,
} from '@/integrations/kyc';
import type { KycVerificationResult } from '@/integrations/kyc/types';
import type { RootStackParamList } from '@/navigation';

export type FallbackErrorSource = 'mrz_scan_failed' | 'nfc_scan_failed';

export interface UseKycLauncherOptions {
  /**
   * Country code for the user's document
   */
  countryCode: string;
  /**
   * Error source to track where the KYC launch was initiated from
   */
  errorSource: FallbackErrorSource;
  /**
   * Optional callback to handle successful verification.
   * Receives the KYC result and the sessionId from the session.
   * If not provided, defaults to navigating to KycSuccess with the sessionId.
   */
  onSuccess?: (
    result: KycVerificationResult,
    sessionId: string,
  ) => void | Promise<void>;
  /**
   * Optional callback to handle user cancellation
   */
  onCancel?: () => void | Promise<void>;
  /**
   * Optional callback to handle verification failure
   */
  onError?: (
    error: unknown,
    result?: KycVerificationResult,
  ) => void | Promise<void>;
}

/**
 * Custom hook for launching KYC verification with consistent error handling.
 *
 * Abstracts the common pattern of:
 * 1. Creating a session
 * 2. Launching the provider SDK
 * 3. Handling errors by navigating to fallback screen
 * 4. Managing loading state
 *
 * @example
 * ```tsx
 * const { launchKycVerification, isLoading } = useKycLauncher({
 *   countryCode: 'US',
 *   errorSource: 'nfc_scan_failed',
 * });
 *
 * <Button onPress={launchKycVerification} disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Try Alternative Verification'}
 * </Button>
 * ```
 */
export const useKycLauncher = (options: UseKycLauncherOptions) => {
  const { countryCode, errorSource, onSuccess, onCancel, onError } = options;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [isLoading, setIsLoading] = useState(false);

  const launchKycVerification = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await createKycSession();
      const result = await startKycVerification(session.sessionToken);

      // Handle user cancellation
      if (result.type === 'cancelled') {
        await onCancel?.();
        return;
      }

      // Handle verification failure
      if (result.type === 'failed') {
        const error =
          result.error?.message || result.error?.type || 'Unknown error';
        const safeError = sanitizeErrorMessage(error);
        console.error('KYC verification failed:', safeError);

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
        await onSuccess(result, session.sessionId);
      } else {
        navigation.navigate('KycSuccess', { sessionId: session.sessionId });
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
    launchKycVerification,
    isLoading,
  };
};
