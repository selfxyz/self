// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useMemo } from 'react';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { KycEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AlertModal, { type AlertModalParams } from '@/components/AlertModal';
import {
  KYC_FAUCET_NOTICE_COPY,
  runKycFaucetNoticeContinuation,
} from '@/integrations/kyc/faucetNotice';
import { useKycFaucetNoticeStore } from '@/stores/kycFaucetNoticeStore';

const KycFaucetNoticeModal: React.FC = () => {
  const selfClient = useSelfClient();
  const isOpen = useKycFaucetNoticeStore(state => state.isOpen);
  const isContinuing = useKycFaucetNoticeStore(state => state.isContinuing);

  useEffect(() => {
    if (isOpen) {
      selfClient.trackEvent(KycEvents.FAUCET_NOTICE_SHOWN);
    }
  }, [isOpen, selfClient]);

  const modalParams = useMemo<AlertModalParams>(() => {
    const decline = () => {
      selfClient.trackEvent(KycEvents.FAUCET_NOTICE_DECLINED);
      useKycFaucetNoticeStore.getState().onDecline?.();
    };
    return {
      titleText: KYC_FAUCET_NOTICE_COPY.titleText,
      bodyText: KYC_FAUCET_NOTICE_COPY.bodyText,
      buttonText: KYC_FAUCET_NOTICE_COPY.continueText,
      secondaryButtonText: KYC_FAUCET_NOTICE_COPY.goBackText,
      onButtonPress: () => {
        selfClient.trackEvent(KycEvents.FAUCET_NOTICE_CONTINUED);
        useKycFaucetNoticeStore.getState().markContinuing();
      },
      onSecondaryButtonPress: decline,
      onModalDismiss: decline,
    };
  }, [selfClient]);

  // AlertModal hides after every button press; while continuing the modal
  // must stay mounted until onHidden so the native dismissal can finish.
  const handleHide = useCallback(() => {
    const store = useKycFaucetNoticeStore.getState();
    if (!store.isContinuing) {
      store.close();
    }
  }, []);

  const handleHidden = useCallback(() => {
    const {
      isContinuing: shouldContinue,
      onContinue,
      close,
    } = useKycFaucetNoticeStore.getState();
    close();
    if (shouldContinue && onContinue) {
      runKycFaucetNoticeContinuation(onContinue);
    }
  }, []);

  if (!isOpen && !isContinuing) return null;

  return (
    <AlertModal
      visible={isOpen}
      modalParams={modalParams}
      onHideModal={handleHide}
      onHidden={handleHidden}
    />
  );
};

export default KycFaucetNoticeModal;
