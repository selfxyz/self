// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { render } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AlertModal from '@/components/AlertModal';
import VerificationGateModal from '@/components/VerificationGateModal';
import { navigationRef } from '@/navigation';
import { useVerificationGateStore } from '@/stores/verificationGateStore';

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

jest.mock('@/components/AlertModal', () => jest.fn(() => null));

jest.mock('@/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

const mockAlertModal = AlertModal as jest.MockedFunction<typeof AlertModal>;
const mockNavigationRef = navigationRef as unknown as {
  isReady: jest.Mock;
  navigate: jest.Mock;
};

describe('VerificationGateModal', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigationRef.isReady.mockReturnValue(true);
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
    render(<VerificationGateModal />);
    const modalProps = mockAlertModal.mock.calls[0]?.[0];
    expect(modalProps.visible).toBe(true);
    expect(modalProps.modalParams.bodyText).toContain('Google USAT Faucet');
    modalProps.modalParams.onButtonPress();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      ProofEvents.GOOGLE_USAT_RECOVER_CLICKED,
    );
    expect(mockNavigationRef.navigate).toHaveBeenCalledWith({
      name: 'CountryPicker',
      params: undefined,
    });
  });

  it('skips navigation when navigationRef is not ready', () => {
    mockNavigationRef.isReady.mockReturnValue(false);
    useVerificationGateStore.getState().open({
      reason: 'google_usat_high_security_required',
      entryPoint: 'qr_scan',
      requesterName: 'Google USAT Faucet',
    });
    render(<VerificationGateModal />);
    const modalProps = mockAlertModal.mock.calls[0]?.[0];
    modalProps.modalParams.onButtonPress();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      ProofEvents.GOOGLE_USAT_RECOVER_CLICKED,
    );
    expect(mockNavigationRef.navigate).not.toHaveBeenCalled();
  });

  it('falls back to a generic app label when requesterName is missing', () => {
    useVerificationGateStore.getState().open({
      reason: 'google_usat_high_security_required',
      entryPoint: 'deeplink',
    });
    render(<VerificationGateModal />);
    const modalProps = mockAlertModal.mock.calls[0]?.[0];
    expect(modalProps.modalParams.bodyText).toContain('this app');
  });

  it('fires dismiss event on secondary action', () => {
    useVerificationGateStore.getState().open({
      reason: 'google_usat_high_security_required',
      entryPoint: 'deeplink',
    });
    render(<VerificationGateModal />);
    const modalProps = mockAlertModal.mock.calls[0]?.[0];
    modalProps.modalParams.onSecondaryButtonPress?.();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      ProofEvents.GOOGLE_USAT_BLOCK_DISMISSED,
    );
  });
});
