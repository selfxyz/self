// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useRef } from 'react';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { usePendingKycStore } from '@/stores/pendingKycStore';

import { useSumsubWebSocket } from './useSumsubWebSocket';

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
  const selfClient = useSelfClient();
  const { pendingVerifications, removeExpiredVerifications } =
    usePendingKycStore();

  const hasAttemptedRecoveryRef = useRef<Set<string>>(new Set());

  const { subscribe, unsubscribeAll } = useSumsubWebSocket({
    skipAddPending: true,
    selfClient,
    onSuccess: () => {
      console.log('[PendingKycRecovery] Successfully recovered verification');
    },
    onError: error => {
      console.error('[PendingKycRecovery] Error:', error);
    },
    onVerificationFailed: reason => {
      console.log('[PendingKycRecovery] Verification failed:', reason);
    },
  });

  // Clean up expired verifications once on mount
  useEffect(() => {
    removeExpiredVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    const activeVerifications = pendingVerifications.filter(
      v =>
        (v.status === 'pending' || v.status === 'processing') &&
        v.timeoutAt > Date.now() &&
        !hasAttemptedRecoveryRef.current.has(v.userId),
    );

    console.log(
      '[PendingKycRecovery] All pending verifications:',
      pendingVerifications,
    );
    console.log(
      '[PendingKycRecovery] Active verifications to recover:',
      activeVerifications,
    );
    console.log(
      '[PendingKycRecovery] Already attempted userIds:',
      Array.from(hasAttemptedRecoveryRef.current),
    );

    activeVerifications.forEach(verification => {
      hasAttemptedRecoveryRef.current.add(verification.userId);

      console.log(
        '[PendingKycRecovery] Recovering verification for userId:',
        verification.userId,
        'status:',
        verification.status,
      );

      subscribe(verification.userId);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeAll();
    };
  }, [pendingVerifications, subscribe, unsubscribeAll]);
}
