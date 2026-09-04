// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, render } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { KycEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AlertModal from '@/components/AlertModal';
import KycFaucetNoticeModal from '@/components/KycFaucetNoticeModal';
import { KYC_FAUCET_NOTICE_COPY } from '@/integrations/kyc/faucetNotice';
import {
  showKycFaucetNotice,
  useKycFaucetNoticeStore,
} from '@/stores/kycFaucetNoticeStore';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

jest.mock('@/components/AlertModal', () => jest.fn(() => null));

const mockAlertModal = AlertModal as jest.MockedFunction<typeof AlertModal>;
const lastProps = () => mockAlertModal.mock.calls.at(-1)?.[0];

describe('KycFaucetNoticeModal', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useKycFaucetNoticeStore.getState().close();
    (useSelfClient as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
    });
  });

  it('renders nothing until the store opens it', () => {
    render(<KycFaucetNoticeModal />);
    expect(mockAlertModal).not.toHaveBeenCalled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('shows the notice copy and tracks the impression when opened', () => {
    render(<KycFaucetNoticeModal />);
    act(() => {
      showKycFaucetNotice({ onContinue: jest.fn() });
    });

    expect(lastProps()?.visible).toBe(true);
    expect(lastProps()?.modalParams).toMatchObject({
      titleText: KYC_FAUCET_NOTICE_COPY.titleText,
      buttonText: KYC_FAUCET_NOTICE_COPY.continueText,
      secondaryButtonText: KYC_FAUCET_NOTICE_COPY.goBackText,
      preventDismiss: false,
    });
    expect(mockTrackEvent).toHaveBeenCalledWith(KycEvents.FAUCET_NOTICE_SHOWN);
  });

  it('locks into loading while onContinue runs, then closes', async () => {
    let finish: () => void = () => {};
    const onContinue = jest.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );
    render(<KycFaucetNoticeModal />);
    act(() => {
      showKycFaucetNotice({ onContinue });
    });

    let pressed: Promise<void> | void;
    act(() => {
      pressed = lastProps()?.modalParams?.onButtonPress();
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      KycEvents.FAUCET_NOTICE_CONTINUED,
    );
    expect(lastProps()?.modalParams).toMatchObject({
      buttonText: KYC_FAUCET_NOTICE_COPY.loadingText,
      disablePrimaryButton: true,
      preventDismiss: true,
    });

    await act(async () => {
      finish();
      await pressed;
    });
    act(() => {
      lastProps()?.onHideModal?.();
    });
    expect(useKycFaucetNoticeStore.getState().isOpen).toBe(false);
  });

  it('runs onDecline and tracks it when the user goes back', () => {
    const onDecline = jest.fn();
    render(<KycFaucetNoticeModal />);
    act(() => {
      showKycFaucetNotice({ onContinue: jest.fn(), onDecline });
    });

    lastProps()?.modalParams?.onSecondaryButtonPress?.();

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      KycEvents.FAUCET_NOTICE_DECLINED,
    );
  });
});
