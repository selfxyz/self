// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  sanitizeErrorMessage,
  trackBranchEvent,
  trackOnboardingStep,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  KycEvents,
  OnboardingEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import {
  createKycSession,
  launchKycVerification as startKycVerification,
} from '@/integrations/kyc';
import type { KycVerificationResult } from '@/integrations/kyc/types';
import type { RootStackParamList } from '@/navigation';
import { useFeedback } from '@/providers/feedbackProvider';

const KYC_PROVIDER = 'didit';

export interface UseKycLauncherOptions {
  /**
   * Country code for the user's document
   */
  countryCode: string;
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
  /**
   * Optional label for the secondary button in the fallback modal.
   */
  cancelLabel?: string;
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
 * });
 *
 * <Button onPress={launchKycVerification} disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Try Alternative Verification'}
 * </Button>
 * ```
 */
export const useKycLauncher = (options: UseKycLauncherOptions) => {
  const {
    countryCode,
    onSuccess,
    onCancel,
    onError,
    cancelLabel = 'Cancel Registration',
  } = options;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showModal } = useFeedback();
  const selfClient = useSelfClient();
  const [isLoading, setIsLoading] = useState(false);

  const launchKycVerification = useCallback(async () => {
    setIsLoading(true);
    const sessionRequestedAt = Date.now();
    try {
      trackOnboardingStep(selfClient, OnboardingEvents.SCAN_STARTED, {
        branch: 'kyc',
      });
      trackBranchEvent(selfClient, KycEvents.SESSION_REQUESTED, {
        provider: KYC_PROVIDER,
      });
      const session = await createKycSession({
        country: countryCode,
        nationality: countryCode,
      });
      trackBranchEvent(selfClient, KycEvents.SESSION_CREATED, {
        provider: KYC_PROVIDER,
        duration_seconds: parseFloat(
          ((Date.now() - sessionRequestedAt) / 1000).toFixed(2),
        ),
      });
      const providerOpenedAt = Date.now();
      trackBranchEvent(selfClient, KycEvents.PROVIDER_OPENED, {
        provider: KYC_PROVIDER,
      });
      const result = await startKycVerification(session.sessionToken);
      const providerDurationSeconds = parseFloat(
        ((Date.now() - providerOpenedAt) / 1000).toFixed(2),
      );

      // Handle user cancellation
      if (result.type === 'cancelled') {
        trackBranchEvent(selfClient, KycEvents.PROVIDER_CLOSED, {
          provider: KYC_PROVIDER,
          outcome: 'cancelled',
          duration_seconds: providerDurationSeconds,
        });
        await onCancel?.();
        return;
      }

      // Handle verification failure
      if (result.type === 'failed') {
        const error =
          result.error?.message || result.error?.type || 'Unknown error';
        const safeError = sanitizeErrorMessage(error);
        console.error('KYC verification failed:', safeError);
        trackBranchEvent(selfClient, KycEvents.PROVIDER_CLOSED, {
          provider: KYC_PROVIDER,
          outcome: 'failed',
          error_code: result.error?.type,
          duration_seconds: providerDurationSeconds,
        });

        // Call custom error handler if provided, otherwise navigate to fallback screen
        if (onError) {
          await onError(safeError, result);
        } else {
          navigation.navigate('KycFailure', {
            countryCode,
            canRetry: true,
          });
        }
        return;
      }

      // Handle success - navigate to KycSuccess by default
      trackBranchEvent(selfClient, KycEvents.PROVIDER_CLOSED, {
        provider: KYC_PROVIDER,
        outcome: 'completed',
        duration_seconds: providerDurationSeconds,
      });
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
        navigation.navigate('KycConnectionError', { countryCode });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigation, selfClient, countryCode, onSuccess, onCancel, onError]);

  const showKycFallbackModal = useCallback(
    (onDismiss: () => void) => {
      const titleText = 'Having trouble scanning your document?';
      const bodyText =
        "You'll be redirected to our third party verification partner.";
      showModal({
        titleText,
        bodyText,
        buttonText: 'Try Alternative Verification',
        secondaryButtonText: cancelLabel,
        onButtonPress: () => {
          showModal({
            titleText,
            bodyText,
            buttonText: 'Loading...',
            disablePrimaryButton: true,
            preventDismiss: true,
            onButtonPress: () => {},
          });
          return launchKycVerification();
        },
        onSecondaryButtonPress: onDismiss,
      });
    },
    [cancelLabel, showModal, launchKycVerification],
  );

  return {
    launchKycVerification,
    showKycFallbackModal,
    isLoading,
  };
};
