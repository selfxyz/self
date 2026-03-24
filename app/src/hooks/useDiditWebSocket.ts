// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { DIDIT_TEE_URL } from '@env';

import { deserializeApplicantInfo } from '@selfxyz/common';
import type { DocumentType, KycData } from '@selfxyz/common/utils/types';

import type { ApplicantInfoSerialized } from '@/integrations/didit/types';
import { navigationRef } from '@/navigation';
import { storeDocumentWithDeduplication } from '@/providers/passportDataProvider';
import { usePendingKycStore } from '@/stores/pendingKycStore';

interface UseDiditWebSocketOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onVerificationFailed?: (reason: string) => void;
  skipAddPending?: boolean;
}

/**
 * Shared hook for Didit websocket subscription logic.
 * Handles connecting to the TEE service, subscribing to a sessionId,
 * and processing verification results.
 */
export function useDiditWebSocket(options: UseDiditWebSocketOptions = {}) {
  const {
    onSuccess,
    onError,
    onVerificationFailed,
    skipAddPending = false,
  } = options;

  const addPendingVerification = usePendingKycStore(
    state => state.addPendingVerification,
  );
  const updateVerificationStatus = usePendingKycStore(
    state => state.updateVerificationStatus,
  );
  const getPendingVerification = usePendingKycStore(
    state => state.getPendingVerification,
  );

  const socketsRef = useRef<Map<string, Socket>>(new Map());
  const subscribedSessionIdsRef = useRef<Set<string>>(new Set());

  const subscribe = useCallback(
    (sessionId: string) => {
      if (subscribedSessionIdsRef.current.has(sessionId)) {
        console.log(
          '[DiditWebSocket] Already subscribed to sessionId:',
          sessionId,
        );
        return;
      }

      const existingVerification = getPendingVerification(sessionId);
      const isProcessing = existingVerification?.status === 'processing';

      // Don't retry 'processing' verifications as the proving machine is reading to be triggered.
      if (isProcessing) {
        console.log(
          '[DiditWebSocket] Verification in processing state, skipping for sessionId:',
          sessionId,
        );
        return;
      }

      if (!skipAddPending) {
        console.log(
          '[DiditWebSocket] Adding pending verification for sessionId:',
          sessionId,
        );
        addPendingVerification(sessionId);
      }
      subscribedSessionIdsRef.current.add(sessionId);

      console.log('[DiditWebSocket] Connecting to WebSocket:', DIDIT_TEE_URL);
      const socket = io(DIDIT_TEE_URL, {
        transports: ['websocket', 'polling'],
      });

      socketsRef.current.set(sessionId, socket);

      socket.on('connect', () => {
        console.log(
          '[DiditWebSocket] Connected, subscribing to user:',
          sessionId,
        );
        socket.emit('subscribe', sessionId);
      });

      socket.on('success', async (data: ApplicantInfoSerialized) => {
        console.log(
          '[DiditWebSocket] Received applicant info for sessionId:',
          sessionId,
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
            '[DiditWebSocket] KYC data stored successfully, documentId:',
            documentId,
          );

          updateVerificationStatus(
            sessionId,
            'processing',
            undefined,
            documentId,
          );

          if (navigationRef.isReady()) {
            navigationRef.navigate('KYCVerified', { documentId });
          }

          onSuccess?.();
        } catch (err) {
          console.error('[DiditWebSocket] Failed to store KYC data:', err);
          updateVerificationStatus(
            sessionId,
            'failed',
            'Failed to store KYC data',
          );
          onError?.('Failed to store KYC data');
        }

        socket.disconnect();
        socketsRef.current.delete(sessionId);
        subscribedSessionIdsRef.current.delete(sessionId);
      });

      socket.on('verification_failed', (reason: string) => {
        console.log('[DiditWebSocket] Verification failed:', reason);
        updateVerificationStatus(sessionId, 'failed', reason);
        onVerificationFailed?.(reason);

        socket.disconnect();
        socketsRef.current.delete(sessionId);
        subscribedSessionIdsRef.current.delete(sessionId);
      });

      socket.on('error', (errorMessage: string) => {
        console.error('[DiditWebSocket] Socket error:', errorMessage);
        updateVerificationStatus(sessionId, 'failed', errorMessage);
        onError?.(errorMessage);

        socket.disconnect();
        socketsRef.current.delete(sessionId);
        subscribedSessionIdsRef.current.delete(sessionId);
      });

      socket.on('disconnect', () => {
        console.log('[DiditWebSocket] Disconnected for sessionId:', sessionId);
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

  const unsubscribe = useCallback((sessionId: string) => {
    const socket = socketsRef.current.get(sessionId);
    if (socket) {
      socket.disconnect();
      socketsRef.current.delete(sessionId);
    }
    subscribedSessionIdsRef.current.delete(sessionId);
  }, []);

  const unsubscribeAll = useCallback(() => {
    socketsRef.current.forEach(socket => {
      socket.disconnect();
    });
    socketsRef.current.clear();
    subscribedSessionIdsRef.current.clear();
  }, []);

  const isSubscribed = useCallback((sessionId: string) => {
    return subscribedSessionIdsRef.current.has(sessionId);
  }, []);

  return {
    subscribe,
    unsubscribe,
    unsubscribeAll,
    isSubscribed,
  };
}
