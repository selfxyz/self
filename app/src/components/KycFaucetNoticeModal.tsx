// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useMemo } from 'react';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { KycEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AlertModal, { type AlertModalParams } from '@/components/AlertModal';
import { KYC_FAUCET_NOTICE_COPY } from '@/integrations/kyc/faucetNotice';
import { useKycFaucetNoticeStore } from '@/stores/kycFaucetNoticeStore';

const KycFaucetNoticeModal: React.FC = () => {
  const selfClient = useSelfClient();
  const isOpen = useKycFaucetNoticeStore(state => state.isOpen);
  const isContinuing = useKycFaucetNoticeStore(state => state.isContinuing);
  const close = useKycFaucetNoticeStore(state => state.close);

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
      buttonText: isContinuing
        ? KYC_FAUCET_NOTICE_COPY.loadingText
        : KYC_FAUCET_NOTICE_COPY.continueText,
      secondaryButtonText: isContinuing
        ? undefined
        : KYC_FAUCET_NOTICE_COPY.goBackText,
      disablePrimaryButton: isContinuing,
      preventDismiss: isContinuing,
      onButtonPress: async () => {
        const { onContinue, markContinuing } =
          useKycFaucetNoticeStore.getState();
        selfClient.trackEvent(KycEvents.FAUCET_NOTICE_CONTINUED);
        markContinuing();
        await onContinue?.();
      },
      onSecondaryButtonPress: decline,
      onModalDismiss: decline,
    };
  }, [isContinuing, selfClient]);

  if (!isOpen) return null;

  return <AlertModal visible modalParams={modalParams} onHideModal={close} />;
};

export default KycFaucetNoticeModal;
