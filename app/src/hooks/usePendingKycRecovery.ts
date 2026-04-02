// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef } from 'react';

import { useDiditWebSocket } from '@/hooks/useDiditWebSocket';
import { navigationRef } from '@/navigation';
import { usePendingKycStore } from '@/stores/pendingKycStore';

type RecoveryVerification = {
  sessionId?: string;
  userId?: string;
  status: 'pending' | 'processing' | 'failed';
  timeoutAt: number;
  documentId?: string;
};

function getRecoveryIdentifier(verification: RecoveryVerification) {
  return verification.sessionId ?? verification.userId;
}

/**
 * Hook to recover pending KYC verifications on app restart.
 *
 * This hook runs on app startup and:
 * 1. Checks for any pending verifications in the store
 * 2. For each non-expired pending/processing verification, reconnects to websocket
 * 3. Subscribes to the sessionId to receive any cached results
 * 4. Updates verification status based on server response
 * 5. Initiates proving machine after document storage (handled in useDiditWebSocket)
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

  const { subscribe, unsubscribeAll } = useDiditWebSocket({
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
      '[PendingKycRecovery] Already attempted sessionIds:',
      Array.from(hasAttemptedRecoveryRef.current),
    );

    const processingWithDocument = pendingVerifications.find(
      v =>
        v.status === 'processing' &&
        v.documentId &&
        v.timeoutAt > Date.now() &&
        !!getRecoveryIdentifier(v) &&
        !hasAttemptedRecoveryRef.current.has(getRecoveryIdentifier(v)!),
    );

    if (processingWithDocument) {
      const recoveryId = getRecoveryIdentifier(processingWithDocument);

      if (!recoveryId) {
        return;
      }

      console.log(
        '[PendingKycRecovery] Resuming processing verification, navigating to KYCVerified:',
        recoveryId,
      );
      if (navigationRef.isReady()) {
        navigationRef.navigate('KYCVerified', {
          documentId: processingWithDocument.documentId,
        });
        // Only mark as attempted after successful navigation
        hasAttemptedRecoveryRef.current.add(recoveryId);
        return;
      }

      // Navigation not ready yet - poll until ready
      console.log(
        '[PendingKycRecovery] Navigation not ready, polling for readiness:',
        recoveryId,
      );

      const pollInterval = setInterval(() => {
        if (navigationRef.isReady()) {
          console.log(
            '[PendingKycRecovery] Navigation ready, navigating for:',
            recoveryId,
          );
          navigationRef.navigate('KYCVerified', {
            documentId: processingWithDocument.documentId,
          });
          hasAttemptedRecoveryRef.current.add(recoveryId);
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
        !!getRecoveryIdentifier(v) &&
        !hasAttemptedRecoveryRef.current.has(getRecoveryIdentifier(v)!),
    );

    if (firstPending) {
      const recoveryId = getRecoveryIdentifier(firstPending);

      if (!recoveryId) {
        return;
      }

      hasAttemptedRecoveryRef.current.add(recoveryId);
      console.log(
        '[PendingKycRecovery] Recovering pending verification:',
        recoveryId,
      );
      subscribe(recoveryId);
    }
  }, [pendingVerifications, subscribe, unsubscribeAll]);
}
