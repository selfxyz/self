// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { render } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AlertModal from '@/components/AlertModal';
import GoogleUsatBlockModal from '@/components/GoogleUsatBlockModal';
import { useVerificationGateStore } from '@/stores/verificationGateStore';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

jest.mock('@/components/AlertModal', () => jest.fn(() => null));

describe('GoogleUsatBlockModal', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useVerificationGateStore.setState({
      isOpen: false,
      reason: null,
      entryPoint: null,
      requesterName: null,
    });
    (useSelfClient as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
    });
  });

  it('renders when store is open and handles primary CTA', () => {
    useVerificationGateStore.getState().open({
      reason: 'google_usat_high_security_required',
      entryPoint: 'qr_scan',
      requesterName: 'Google USAT Faucet',
    });
    render(<GoogleUsatBlockModal />);
    const modalProps = mockAlertModal.mock.calls[0]?.[0];
    expect(modalProps.visible).toBe(true);
    expect(modalProps.modalParams.bodyText).toContain('Google USAT Faucet');
    modalProps.modalParams.onButtonPress();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      ProofEvents.GOOGLE_USAT_RECOVER_CLICKED,
    );
  });

  it('fires dismiss event on secondary action', () => {
    useVerificationGateStore.getState().open({
      reason: 'google_usat_high_security_required',
      entryPoint: 'deeplink',
    });
    render(<GoogleUsatBlockModal />);
    const modalProps = mockAlertModal.mock.calls[0]?.[0];
    modalProps.modalParams.onSecondaryButtonPress?.();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      ProofEvents.GOOGLE_USAT_BLOCK_DISMISSED,
    );
  });
});
const mockAlertModal = AlertModal as jest.MockedFunction<typeof AlertModal>;
