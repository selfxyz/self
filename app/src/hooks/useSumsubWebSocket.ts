// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SUMSUB_TEE_URL } from '@env';

import { deserializeApplicantInfo } from '@selfxyz/common';
import type {
  DocumentCategory,
  DocumentType,
  KycData,
} from '@selfxyz/common/utils/types';
import {
  loadSelectedDocument,
  SdkEvents,
  type SelfClient,
} from '@selfxyz/mobile-sdk-alpha';

import type { SumsubApplicantInfoSerialized } from '@/integrations/sumsub/types';
import { storeDocumentWithDeduplication } from '@/providers/passportDataProvider';
import { usePendingKycStore } from '@/stores/pendingKycStore';

interface UseSumsubWebSocketOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onVerificationFailed?: (reason: string) => void;
  skipAddPending?: boolean;
  selfClient?: SelfClient;
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
    selfClient,
  } = options;

  const {
    addPendingVerification,
    updateVerificationStatus,
    removePendingVerification,
    getPendingVerification,
  } = usePendingKycStore();

  const socketsRef = useRef<Map<string, Socket>>(new Map());
  const subscribedUserIdsRef = useRef<Set<string>>(new Set());

  const triggerRegistrationFlow = useCallback(async () => {
    if (!selfClient) {
      console.warn(
        '[SumsubWebSocket] Cannot trigger registration flow: selfClient not provided',
      );
      return;
    }

    try {
      const selectedDocument = await loadSelectedDocument(selfClient);
      if (!selectedDocument) {
        console.error(
          '[SumsubWebSocket] No document found to trigger registration',
        );
        return;
      }

      const documentMetadata: {
        documentCategory?: DocumentCategory;
        signatureAlgorithm?: string;
        curveOrExponent?: string;
      } = {
        documentCategory: 'kyc' as const,
      };

      console.log(
        '[SumsubWebSocket] Emitting DOCUMENT_OWNERSHIP_CONFIRMED to trigger registration flow',
      );
      selfClient.emit(SdkEvents.DOCUMENT_OWNERSHIP_CONFIRMED, documentMetadata);
      console.log('[SumsubWebSocket] Registration flow triggered successfully');
    } catch (err) {
      console.error(
        '[SumsubWebSocket] Failed to trigger registration flow:',
        err,
      );
    }
  }, [selfClient]);

  const subscribe = useCallback(
    (userId: string) => {
      if (subscribedUserIdsRef.current.has(userId)) {
        console.log('[SumsubWebSocket] Already subscribed to userId:', userId);
        return;
      }

      const existingVerification = getPendingVerification(userId);
      const isProcessing = existingVerification?.status === 'processing';

      if (isProcessing && selfClient) {
        console.log(
          '[SumsubWebSocket] Document already stored (processing status), triggering registration flow for userId:',
          userId,
        );
        triggerRegistrationFlow();
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
        );

        updateVerificationStatus(userId, 'processing');

        try {
          const applicantInfoDeserialized = deserializeApplicantInfo(
            data.applicantInfo,
          );
          const kycData: KycData = {
            documentType: applicantInfoDeserialized.idType as DocumentType,
            documentCategory: 'kyc',
            mock: false,
            signature: data.signature,
            pubkey: data.pubkey,
            serializedApplicantInfo: data.applicantInfo,
          };
          await storeDocumentWithDeduplication(kycData);
          console.log('[SumsubWebSocket] KYC data stored successfully');

          // this initiates the proving machine
          await triggerRegistrationFlow();

          removePendingVerification(userId);
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
      removePendingVerification,
      getPendingVerification,
      onSuccess,
      onError,
      onVerificationFailed,
      skipAddPending,
      selfClient,
      triggerRegistrationFlow,
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
