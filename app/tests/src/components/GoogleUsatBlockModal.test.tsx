// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import { render } from '@testing-library/react-native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import GoogleUsatBlockModal from '@/components/GoogleUsatBlockModal';
import AlertModal from '@/components/AlertModal';
import { useGoogleUsatBlockStore } from '@/stores/googleUsatBlockStore';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(),
}));

jest.mock('@/components/AlertModal', () => jest.fn(() => null));

describe('GoogleUsatBlockModal', () => {
  const mockNavigate = jest.fn();
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useGoogleUsatBlockStore.setState({ isOpen: false, entryPoint: null });
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    (useSelfClient as jest.Mock).mockReturnValue({ trackEvent: mockTrackEvent });
  });

  it('renders when store is open and handles primary CTA', () => {
    useGoogleUsatBlockStore.getState().open('qr_scan');
    render(<GoogleUsatBlockModal />);
    const modalProps = mockAlertModal.mock.calls[0]?.[0];
    expect(modalProps.visible).toBe(true);
    modalProps.modalParams.onButtonPress();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      ProofEvents.GOOGLE_USAT_RECOVER_CLICKED,
    );
    expect(mockNavigate).toHaveBeenCalledWith('CountryPicker');
  });

  it('fires dismiss event on secondary action', () => {
    useGoogleUsatBlockStore.getState().open('deeplink');
    render(<GoogleUsatBlockModal />);
    const modalProps = mockAlertModal.mock.calls[0]?.[0];
    modalProps.modalParams.onSecondaryButtonPress?.();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      ProofEvents.GOOGLE_USAT_BLOCK_DISMISSED,
    );
  });
});
  const mockAlertModal = AlertModal as jest.MockedFunction<typeof AlertModal>;
