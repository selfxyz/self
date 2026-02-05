// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SUMSUB_TEE_URL } from '@env';

import { deserializeApplicantInfo } from '@selfxyz/common';
import type { DocumentType, KycData } from '@selfxyz/common/utils/types';

import type { SumsubApplicantInfoSerialized } from '@/integrations/sumsub/types';
import { navigationRef } from '@/navigation';
import { storeDocumentWithDeduplication } from '@/providers/passportDataProvider';
import { usePendingKycStore } from '@/stores/pendingKycStore';

interface UseSumsubWebSocketOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onVerificationFailed?: (reason: string) => void;
  skipAddPending?: boolean;
}

/**
 * Shared hook for Sumsub websocket subscription logic.
 * Handles connecting to the TEE service, subscribing to a userId,
 * and processing verification results.
 */
export function useSumsubWebSocket(options: UseSumsubWebSocketOptions = {}) {
  const {
    onSuccess,
    onError,
    onVerificationFailed,
    skipAddPending = false,
  } = options;

  const {
    addPendingVerification,
    updateVerificationStatus,
    getPendingVerification,
  } = usePendingKycStore();

  const socketsRef = useRef<Map<string, Socket>>(new Map());
  const subscribedUserIdsRef = useRef<Set<string>>(new Set());

  const subscribe = useCallback(
    (userId: string) => {
      if (subscribedUserIdsRef.current.has(userId)) {
        console.log('[SumsubWebSocket] Already subscribed to userId:', userId);
        return;
      }

      const existingVerification = getPendingVerification(userId);
      const isProcessing = existingVerification?.status === 'processing';

      // Don't retry 'processing' verifications as the proving machine is reading to be triggered.
      if (isProcessing) {
        console.log(
          '[SumsubWebSocket] Verification in processing state, skipping for userId:',
          userId,
        );
        return;
      }

      if (!skipAddPending) {
        console.log(
          '[SumsubWebSocket] Adding pending verification for userId:',
          userId,
        );
        addPendingVerification(userId);
      }
      subscribedUserIdsRef.current.add(userId);

      console.log('[SumsubWebSocket] Connecting to WebSocket:', SUMSUB_TEE_URL);
      const socket = io(SUMSUB_TEE_URL, {
        transports: ['websocket', 'polling'],
      });

      socketsRef.current.set(userId, socket);

      socket.on('connect', () => {
        console.log(
          '[SumsubWebSocket] Connected, subscribing to user:',
          userId,
        );
        socket.emit('subscribe', userId);
      });

      socket.on('success', async (data: SumsubApplicantInfoSerialized) => {
        console.log(
          '[SumsubWebSocket] Received applicant info for userId:',
          userId,
          data,
        );

        try {
          const applicantInfoDeserialized = deserializeApplicantInfo(
            data.applicantInfo,
          );
          const kycData: KycData = {
            documentType: applicantInfoDeserialized.idType as DocumentType,
            documentCategory: 'kyc',
            mock: applicantInfoDeserialized.idNumber.startsWith('Mock'),
            signature: data.signature,
            pubkey: data.pubkey,
            serializedApplicantInfo: data.applicantInfo,
          };
          const documentId = await storeDocumentWithDeduplication(kycData);
          console.log(
            '[SumsubWebSocket] KYC data stored successfully, documentId:',
            documentId,
          );

          updateVerificationStatus(userId, 'processing', undefined, documentId);

          if (navigationRef.isReady()) {
            navigationRef.navigate('KYCVerified', { documentId });
          }

          onSuccess?.();
        } catch (err) {
          console.error('[SumsubWebSocket] Failed to store KYC data:', err);
          updateVerificationStatus(
            userId,
            'failed',
            'Failed to store KYC data',
          );
          onError?.('Failed to store KYC data');
        }

        socket.disconnect();
        socketsRef.current.delete(userId);
        subscribedUserIdsRef.current.delete(userId);
      });

      socket.on('verification_failed', (reason: string) => {
        console.log('[SumsubWebSocket] Verification failed:', reason);
        updateVerificationStatus(userId, 'failed', reason);
        onVerificationFailed?.(reason);

        socket.disconnect();
        socketsRef.current.delete(userId);
        subscribedUserIdsRef.current.delete(userId);
      });

      socket.on('error', (errorMessage: string) => {
        console.error('[SumsubWebSocket] Socket error:', errorMessage);
        updateVerificationStatus(userId, 'failed', errorMessage);
        onError?.(errorMessage);

        socket.disconnect();
        socketsRef.current.delete(userId);
        subscribedUserIdsRef.current.delete(userId);
      });

      socket.on('disconnect', () => {
        console.log('[SumsubWebSocket] Disconnected for userId:', userId);
      });
    },
    [
      addPendingVerification,
      updateVerificationStatus,
      getPendingVerification,
      onSuccess,
      onError,
      onVerificationFailed,
      skipAddPending,
    ],
  );

  const unsubscribe = useCallback((userId: string) => {
    const socket = socketsRef.current.get(userId);
    if (socket) {
      socket.disconnect();
      socketsRef.current.delete(userId);
    }
    subscribedUserIdsRef.current.delete(userId);
  }, []);

  const unsubscribeAll = useCallback(() => {
    socketsRef.current.forEach(socket => {
      socket.disconnect();
    });
    socketsRef.current.clear();
    subscribedUserIdsRef.current.clear();
  }, []);

  const isSubscribed = useCallback((userId: string) => {
    return subscribedUserIdsRef.current.has(userId);
  }, []);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    isSubscribed,
  };
}
