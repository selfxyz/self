// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef } from 'react';

import { useSumsubWebSocket } from '@/hooks/useSumsubWebSocket';
import { navigationRef } from '@/navigation';
import { usePendingKycStore } from '@/stores/pendingKycStore';

/**
 * Hook to recover pending KYC verifications on app restart.
 *
 * This hook runs on app startup and:
 * 1. Checks for any pending verifications in the store
 * 2. For each non-expired pending/processing verification, reconnects to websocket
 * 3. Subscribes to the userId to receive any cached results
 * 4. Updates verification status based on server response
 * 5. Initiates proving machine after document storage (handled in useSumsubWebSocket)
 *
 * NOTE: This requires the TEE server to cache completed verification results
 * so they can be retrieved when the app reopens.
 */
export function usePendingKycRecovery() {
  const { pendingVerifications, removeExpiredVerifications } =
    usePendingKycStore();

  const hasAttemptedRecoveryRef = useRef<Set<string>>(new Set());

  const handleSuccess = useCallback(() => {
    console.log('[PendingKycRecovery] Successfully recovered verification');
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('[PendingKycRecovery] Error:', error);
  }, []);

  const handleVerificationFailed = useCallback((reason: string) => {
    console.log('[PendingKycRecovery] Verification failed:', reason);
  }, []);

  const { subscribe, unsubscribeAll } = useSumsubWebSocket({
    skipAddPending: true,
    onSuccess: handleSuccess,
    onError: handleError,
    onVerificationFailed: handleVerificationFailed,
  });

  // Clean up expired verifications once on mount
  useEffect(() => {
    removeExpiredVerifications();

    return () => unsubscribeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    console.log(
      '[PendingKycRecovery] Already attempted userIds:',
      Array.from(hasAttemptedRecoveryRef.current),
    );

    const processingWithDocument = pendingVerifications.find(
      v =>
        v.status === 'processing' &&
        v.documentId &&
        v.timeoutAt > Date.now() &&
        !hasAttemptedRecoveryRef.current.has(v.userId),
    );

    if (processingWithDocument) {
      console.log(
        '[PendingKycRecovery] Resuming processing verification, navigating to KYCVerified:',
        processingWithDocument.userId,
      );
      if (navigationRef.isReady()) {
        navigationRef.navigate('KYCVerified', {
          documentId: processingWithDocument.documentId,
        });
        // Only mark as attempted after successful navigation
        hasAttemptedRecoveryRef.current.add(processingWithDocument.userId);
        return;
      }

      // Navigation not ready yet - poll until ready
      console.log(
        '[PendingKycRecovery] Navigation not ready, polling for readiness:',
        processingWithDocument.userId,
      );

      const pollInterval = setInterval(() => {
        if (navigationRef.isReady()) {
          console.log(
            '[PendingKycRecovery] Navigation ready, navigating for:',
            processingWithDocument.userId,
          );
          navigationRef.navigate('KYCVerified', {
            documentId: processingWithDocument.documentId,
          });
          hasAttemptedRecoveryRef.current.add(processingWithDocument.userId);
          clearInterval(pollInterval);
        }
      }, 100); // Poll every 100ms

      // Cleanup polling on unmount or dependency change
      return () => {
        clearInterval(pollInterval);
      };
    }

    const firstPending = pendingVerifications.find(
      v =>
        v.status === 'pending' &&
        v.timeoutAt > Date.now() &&
        !hasAttemptedRecoveryRef.current.has(v.userId),
    );

    if (firstPending) {
      hasAttemptedRecoveryRef.current.add(firstPending.userId);
      console.log(
        '[PendingKycRecovery] Recovering pending verification:',
        firstPending.userId,
      );
      subscribe(firstPending.userId);
    }
  }, [pendingVerifications, subscribe, unsubscribeAll]);
}
