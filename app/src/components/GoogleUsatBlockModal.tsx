// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useMemo } from 'react';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AlertModal, { type AlertModalParams } from '@/components/AlertModal';
import { navigationRef } from '@/navigation';
import { useVerificationGateStore } from '@/stores/verificationGateStore';

const GoogleUsatBlockModal: React.FC = () => {
  const selfClient = useSelfClient();
  const { isOpen, close, requesterName, reason } = useVerificationGateStore();
  const appName = requesterName?.trim() || 'this app';
  const titleText =
    reason === 'google_usat_high_security_required'
      ? 'High-security ID required'
      : 'Verification requirement';

  const modalParams = useMemo<AlertModalParams>(
    () => ({
      titleText,
      bodyText: `${appName} requires a passport or NFC-verified ID. Your current ID can't be used here. Register a high-security ID to continue.`,
      buttonText: 'Register a high-security ID',
      secondaryButtonText: 'Not now',
      onButtonPress: () => {
        selfClient.trackEvent(ProofEvents.GOOGLE_USAT_RECOVER_CLICKED);
        navigationRef.navigate({
          name: 'CountryPicker',
          params: undefined,
        });
      },
      onSecondaryButtonPress: () => {
        selfClient.trackEvent(ProofEvents.GOOGLE_USAT_BLOCK_DISMISSED);
      },
      onModalDismiss: () => {
        selfClient.trackEvent(ProofEvents.GOOGLE_USAT_BLOCK_DISMISSED);
      },
    }),
    [appName, selfClient, titleText],
  );

  return (
    <AlertModal
      visible={isOpen}
      modalParams={modalParams}
      onHideModal={close}
    />
  );
};

export default GoogleUsatBlockModal;
