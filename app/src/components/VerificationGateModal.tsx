// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AlertModal, { type AlertModalParams } from '@/components/AlertModal';
import { navigationRef } from '@/navigation';
import {
  useVerificationGateStore,
  type VerificationGateReason,
} from '@/stores/verificationGateStore';

interface ReasonCopy {
  titleText: string;
  bodyText: (appName: string) => string;
  buttonText: string;
  recoverEvent: string;
  dismissEvent: string;
}

const REASON_COPY: Record<VerificationGateReason, ReasonCopy> = {
  google_usat_high_security_required: {
    titleText: 'High-security ID required',
    bodyText: appName =>
      `${appName} requires a passport or NFC-verified ID. Your current ID can't be used here. Register a high-security ID to continue.`,
    buttonText: 'Register a high-security ID',
    recoverEvent: ProofEvents.GOOGLE_USAT_RECOVER_CLICKED,
    dismissEvent: ProofEvents.GOOGLE_USAT_BLOCK_DISMISSED,
  },
};

const VerificationGateModal: React.FC = () => {
  const selfClient = useSelfClient();
  const isOpen = useVerificationGateStore(state => state.isOpen);
  const close = useVerificationGateStore(state => state.close);
  const reason = useVerificationGateStore(state => state.reason);
  const requesterName = useVerificationGateStore(state => state.requesterName);
  const appName = requesterName?.trim() || 'this app';
  const copy = reason ? REASON_COPY[reason] : null;

  const modalParams = useMemo<AlertModalParams | null>(() => {
    if (!copy) return null;
    return {
      titleText: copy.titleText,
      bodyText: copy.bodyText(appName),
      buttonText: copy.buttonText,
      secondaryButtonText: 'Not now',
      onButtonPress: () => {
        selfClient.trackEvent(copy.recoverEvent);
        if (navigationRef.isReady()) {
          navigationRef.navigate({
            name: 'CountryPicker',
            params: undefined,
          });
        }
      },
      onSecondaryButtonPress: () => {
        selfClient.trackEvent(copy.dismissEvent);
      },
      onModalDismiss: () => {
        selfClient.trackEvent(copy.dismissEvent);
      },
    };
  }, [appName, copy, selfClient]);

  if (!modalParams) return null;

  return (
    <AlertModal
      visible={isOpen}
      modalParams={modalParams}
      onHideModal={close}
    />
  );
};

export default VerificationGateModal;
