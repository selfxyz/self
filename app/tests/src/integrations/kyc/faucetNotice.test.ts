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

  it('resolves true on continue and runs onContinue only once the modal is hidden', async () => {
    const onContinue = jest.fn().mockResolvedValue(undefined);
    const result = confirmKycFaucetNotice(showModal, { onContinue }, tracker);

    lastModal().onButtonPress();

    expect(tracker.trackEvent).toHaveBeenCalledWith(
      KycEvents.FAUCET_NOTICE_CONTINUED,
    );
    await expect(result).resolves.toBe(true);
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();

    lastModal().onHidden?.();

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('does not run onContinue when the modal hides after a decline', async () => {
    const onContinue = jest.fn();
    const result = confirmKycFaucetNotice(showModal, { onContinue }, tracker);

    await lastModal().onSecondaryButtonPress?.();
    lastModal().onHidden?.();

    await expect(result).resolves.toBe(false);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('logs instead of throwing when onContinue rejects', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onContinue = jest.fn().mockRejectedValue(new Error('boom'));
    const result = confirmKycFaucetNotice(showModal, { onContinue });

    lastModal().onButtonPress();
    lastModal().onHidden?.();
    await expect(result).resolves.toBe(true);
    await new Promise(resolve => setImmediate(resolve));

    expect(error).toHaveBeenCalledWith(
      '[KycFaucetNotice] onContinue failed:',
      expect.any(Error),
    );
    error.mockRestore();
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
