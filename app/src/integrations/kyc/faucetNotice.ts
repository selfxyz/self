// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfClient } from '@selfxyz/mobile-sdk-alpha';
import { KycEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import type { AlertModalParams } from '@/components/AlertModal';

export const KYC_FAUCET_NOTICE_COPY = {
  titleText: 'Not compatible with the Google USAT faucet',
  bodyText:
    'IDs verified through our third-party partner cannot be used to claim from the Google USAT mainnet faucet. To claim from the faucet, verify a passport or an NFC-enabled ID instead.',
  continueText: 'Continue anyway',
  goBackText: 'Go back',
  loadingText: 'Loading...',
} as const;

export interface KycFaucetNoticeHandlers {
  onContinue: () => Promise<void> | void;
  onDecline?: () => void;
}

export type KycFaucetNoticeTracker = Pick<SelfClient, 'trackEvent'>;

/**
 * Shows the faucet-incompatibility notice through an alert modal `showModal`
 * and resolves with `true` after `onContinue` settles, or `false` when the user
 * backs out. While `onContinue` runs the same modal switches to a locked
 * loading state, so callers that were themselves launched from an alert modal
 * never stack a second RN Modal.
 */
export function confirmKycFaucetNotice(
  showModal: (params: AlertModalParams) => void,
  { onContinue, onDecline }: KycFaucetNoticeHandlers,
  tracker?: KycFaucetNoticeTracker,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    let settled = false;
    const settle = (accepted: boolean) => {
      if (settled) return;
      settled = true;
      resolve(accepted);
    };
    const decline = () => {
      if (settled) return;
      tracker?.trackEvent(KycEvents.FAUCET_NOTICE_DECLINED);
      onDecline?.();
      settle(false);
    };

    tracker?.trackEvent(KycEvents.FAUCET_NOTICE_SHOWN);
    showModal({
      titleText: KYC_FAUCET_NOTICE_COPY.titleText,
      bodyText: KYC_FAUCET_NOTICE_COPY.bodyText,
      buttonText: KYC_FAUCET_NOTICE_COPY.continueText,
      secondaryButtonText: KYC_FAUCET_NOTICE_COPY.goBackText,
      onButtonPress: async () => {
        tracker?.trackEvent(KycEvents.FAUCET_NOTICE_CONTINUED);
        showModal({
          titleText: KYC_FAUCET_NOTICE_COPY.titleText,
          bodyText: KYC_FAUCET_NOTICE_COPY.bodyText,
          buttonText: KYC_FAUCET_NOTICE_COPY.loadingText,
          disablePrimaryButton: true,
          preventDismiss: true,
          onButtonPress: () => {},
        });
        try {
          await onContinue();
        } finally {
          settle(true);
        }
      },
      onSecondaryButtonPress: decline,
      onModalDismiss: decline,
    });
  });
}
