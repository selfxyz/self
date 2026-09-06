// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { KycEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import type { AlertModalParams } from '@/components/AlertModal';
import {
  confirmKycFaucetNotice,
  KYC_FAUCET_NOTICE_COPY,
} from '@/integrations/kyc/faucetNotice';

describe('confirmKycFaucetNotice', () => {
  const showModal = jest.fn<void, [AlertModalParams]>();
  const tracker = { trackEvent: jest.fn() };
  const lastModal = () => showModal.mock.calls.at(-1)?.[0] as AlertModalParams;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the notice with continue and go-back actions', () => {
    confirmKycFaucetNotice(showModal, { onContinue: jest.fn() }, tracker).catch(
      () => undefined,
    );

    expect(lastModal()).toMatchObject({
      titleText: KYC_FAUCET_NOTICE_COPY.titleText,
      bodyText: expect.stringContaining('Google USAT mainnet faucet'),
      buttonText: KYC_FAUCET_NOTICE_COPY.continueText,
      secondaryButtonText: KYC_FAUCET_NOTICE_COPY.goBackText,
    });
    expect(tracker.trackEvent).toHaveBeenCalledWith(
      KycEvents.FAUCET_NOTICE_SHOWN,
    );
  });

  it('locks the modal into a loading state and resolves true after onContinue settles', async () => {
    let finish: () => void = () => {};
    const onContinue = jest.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );
    const result = confirmKycFaucetNotice(showModal, { onContinue }, tracker);

    const pressed = lastModal().onButtonPress();

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(lastModal()).toMatchObject({
      buttonText: KYC_FAUCET_NOTICE_COPY.loadingText,
      disablePrimaryButton: true,
      preventDismiss: true,
    });
    expect(tracker.trackEvent).toHaveBeenCalledWith(
      KycEvents.FAUCET_NOTICE_CONTINUED,
    );

    finish();
    await pressed;
    await expect(result).resolves.toBe(true);
  });

  it('resolves true even when onContinue rejects', async () => {
    const onContinue = jest.fn().mockRejectedValue(new Error('boom'));
    const result = confirmKycFaucetNotice(showModal, { onContinue });

    await expect(lastModal().onButtonPress()).rejects.toThrow('boom');
    await expect(result).resolves.toBe(true);
  });

  it('resolves false and never runs onContinue when the user goes back', async () => {
    const onContinue = jest.fn();
    const onDecline = jest.fn();
    const result = confirmKycFaucetNotice(
      showModal,
      { onContinue, onDecline },
      tracker,
    );

    await lastModal().onSecondaryButtonPress?.();

    await expect(result).resolves.toBe(false);
    expect(onContinue).not.toHaveBeenCalled();
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(tracker.trackEvent).toHaveBeenCalledWith(
      KycEvents.FAUCET_NOTICE_DECLINED,
    );
  });

  it('treats closing the modal as declining', async () => {
    const onContinue = jest.fn();
    const result = confirmKycFaucetNotice(showModal, { onContinue }, tracker);

    lastModal().onModalDismiss?.();

    await expect(result).resolves.toBe(false);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
