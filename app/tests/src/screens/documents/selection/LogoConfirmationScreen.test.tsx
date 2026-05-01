// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { createKycSession, launchKycVerification } from '@/integrations/kyc';
import { useFeedback } from '@/providers/feedbackProvider';
import LogoConfirmationScreen from '@/screens/documents/selection/LogoConfirmationScreen';

const MockText = Text;
const MockTouchableOpacity = TouchableOpacity;
const MockView = View;

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockShowModal = jest.fn();
let mockSetOnboardingBranch = jest.fn();
let mockTrackOnboardingStep = jest.fn();
let mockFailOnboardingAttempt = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: {
      countryCode: 'US',
      documentType: 'p',
    },
  }),
}));

jest.mock('@/providers/feedbackProvider', () => ({
  useFeedback: jest.fn(),
}));

jest.mock('@/hooks/useHapticNavigation', () => jest.fn(() => jest.fn()));

jest.mock('@/integrations/haptics', () => ({
  buttonTap: jest.fn(),
}));

jest.mock('@/integrations/kyc', () => ({
  createKycSession: jest.fn(),
  launchKycVerification: jest.fn(),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  failOnboardingAttempt: jest.fn(),
  setOnboardingBranch: jest.fn(),
  trackOnboardingStep: jest.fn(),
  useSelfClient: jest.fn(() => ({
    trackEvent: mockTrackEvent,
  })),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  OnboardingEvents: {
    SCAN_STARTED: 'SCAN_STARTED',
    SCAN_SUCCEEDED: 'SCAN_SUCCEEDED',
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  BodyText: ({ children }: { children: React.ReactNode }) => (
    <MockText>{children}</MockText>
  ),
  ButtonsContainer: ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  ),
  PrimaryButton: ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) => (
    <MockTouchableOpacity onPress={onPress}>
      <MockText>{children}</MockText>
    </MockTouchableOpacity>
  ),
  SecondaryButton: ({
    children,
    onPress,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
  }) => (
    <MockTouchableOpacity onPress={onPress}>
      <MockText>{children}</MockText>
    </MockTouchableOpacity>
  ),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000',
  slate100: '#eee',
  slate400: '#999',
  white: '#fff',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/fonts', () => ({
  advercase: 'advercase',
  dinot: 'dinot',
}));

jest.mock('@/components/navbar/DocumentFlowNavBar', () => ({
  DocumentFlowNavBar: ({ title }: { title: string }) => (
    <MockText>{title}</MockText>
  ),
}));

jest.mock('@/layouts/ExpandableBottomLayout', () => ({
  ExpandableBottomLayout: {
    Layout: ({ children }: { children: React.ReactNode }) => (
      <MockView>{children}</MockView>
    ),
    TopSection: ({ children }: { children: React.ReactNode }) => (
      <MockView>{children}</MockView>
    ),
    BottomSection: ({ children }: { children: React.ReactNode }) => (
      <MockView>{children}</MockView>
    ),
  },
}));

jest.mock('@/assets/icons/epassport_logo.svg', () => 'EPassportLogo');

const MockCreateKycSession = createKycSession as jest.MockedFunction<
  typeof createKycSession
>;
const MockLaunchKycVerification = launchKycVerification as jest.MockedFunction<
  typeof launchKycVerification
>;
const MockUseFeedback = useFeedback as jest.MockedFunction<typeof useFeedback>;

beforeAll(() => {
  ({
    setOnboardingBranch: mockSetOnboardingBranch,
  } = require('@selfxyz/mobile-sdk-alpha'));
  ({
    trackOnboardingStep: mockTrackOnboardingStep,
  } = require('@selfxyz/mobile-sdk-alpha'));
  ({
    failOnboardingAttempt: mockFailOnboardingAttempt,
  } = require('@selfxyz/mobile-sdk-alpha'));
});

describe('LogoConfirmationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockUseFeedback.mockReturnValue({ showModal: mockShowModal } as any);
    MockCreateKycSession.mockResolvedValue({
      sessionId: 'sess-1',
      sessionToken: 'tok-1',
    });
  });

  it('routes declined completed KYC results to KycFailure and tracks decline telemetry', async () => {
    MockLaunchKycVerification.mockResolvedValue({
      type: 'completed',
      session: { status: 'Declined', sessionId: 'didit-1' },
    });

    render(<LogoConfirmationScreen />);

    fireEvent.press(screen.getByText('No'));

    expect(mockShowModal).toHaveBeenCalledTimes(1);
    const modalConfig = mockShowModal.mock.calls[0]?.[0] as {
      onButtonPress: () => Promise<void>;
    };

    await act(async () => {
      await modalConfig.onButtonPress();
    });

    expect(mockSetOnboardingBranch).toHaveBeenCalledWith('kyc');
    expect(mockTrackOnboardingStep).toHaveBeenCalledWith(
      expect.objectContaining({ trackEvent: mockTrackEvent }),
      'SCAN_STARTED',
      { branch: 'kyc' },
    );
    expect(mockFailOnboardingAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ trackEvent: mockTrackEvent }),
      'scan_started',
      'kyc_declined:Declined',
    );
    expect(mockNavigate).toHaveBeenCalledWith('KycFailure', {
      countryCode: 'US',
      canRetry: true,
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('KycSuccess', {
      sessionId: 'sess-1',
    });
  });
});
