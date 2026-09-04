// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { useKycLauncher } from '@/hooks/useKycLauncher';
import DocumentNFCTroubleScreen from '@/screens/documents/scanning/DocumentNFCTroubleScreen';
import { useNfcTroubleStore } from '@/stores/nfcTroubleStore';

const mockGoBack = jest.fn();
const mockGoToNfcMethodSelection = jest.fn();
const mockLaunchKycVerification = jest.fn();

let capturedLayoutProps: any;

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ goBack: mockGoBack })),
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  useSelfClient: jest.fn(() => ({
    useMRZStore: () => ({ countryCode: 'US' }),
  })),
}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  Caption: ({ children }: any) => <>{children}</>,
  SecondaryButton: ({ children, onPress, disabled }: any) => (
    <mock-secondary-button onPress={onPress} disabled={disabled}>
      {children}
    </mock-secondary-button>
  ),
}));

jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Tap: () => ({
      numberOfTaps: () => ({
        onStart: () => null,
      }),
    }),
  },
  GestureDetector: ({ children }: any) => children,
}));

jest.mock('tamagui', () => ({
  YStack: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/components/support/SupportUuidRow', () => {
  const MockSupportUuidRow = () => <mock-support-row />;
  return MockSupportUuidRow;
});
jest.mock('@/components/Tips', () => {
  const MockTips = ({ items }: any) => <mock-tips count={items.length} />;
  return MockTips;
});
jest.mock('@/hooks/useFeedbackAutoHide', () => ({
  useFeedbackAutoHide: jest.fn(),
}));

jest.mock('@/hooks/useHapticNavigation', () => ({
  __esModule: true,
  default: jest.fn((routeName: string) => {
    if (routeName === 'DocumentNFCMethodSelection') {
      return mockGoToNfcMethodSelection;
    }
    return jest.fn();
  }),
}));

jest.mock('@/hooks/useKycLauncher', () => ({
  useKycLauncher: jest.fn(() => ({
    launchKycVerification: mockLaunchKycVerification,
    isKycAvailable: true,
    isLoading: false,
  })),
}));

jest.mock('@/integrations/haptics', () => ({ selectionChange: jest.fn() }));
jest.mock('@/services/analytics', () => ({ flushAllAnalytics: jest.fn() }));

jest.mock('@/layouts/SimpleScrolledTitleLayout', () => ({
  __esModule: true,
  default: (props: any) => {
    capturedLayoutProps = props;
    return (
      <>
        {props.children}
        {props.footer}
      </>
    );
  },
}));

describe('DocumentNFCTroubleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedLayoutProps = undefined;
    useNfcTroubleStore.getState().reset();
  });

  it('hides "Open NFC Options" until options are revealed', () => {
    render(<DocumentNFCTroubleScreen />);

    expect(capturedLayoutProps.secondaryButtonText).toBeUndefined();
    expect(capturedLayoutProps.onSecondaryButtonPress).toBeUndefined();
  });

  it('shows "Open NFC Options" and wires action after reveal', () => {
    useNfcTroubleStore.getState().revealOptions();

    render(<DocumentNFCTroubleScreen />);

    expect(capturedLayoutProps.secondaryButtonText).toBe('Open NFC Options');
    expect(typeof capturedLayoutProps.onSecondaryButtonPress).toBe('function');

    capturedLayoutProps.onSecondaryButtonPress();
    expect(mockGoToNfcMethodSelection).toHaveBeenCalledTimes(1);
  });

  it('renders the alternative verification button and triggers the launcher', () => {
    const { UNSAFE_getByType } = render(<DocumentNFCTroubleScreen />);
    fireEvent.press(UNSAFE_getByType('mock-secondary-button'));
    expect(mockLaunchKycVerification).toHaveBeenCalledTimes(1);
  });

  it('hides the alternative verification button when the KYC flow is disabled', () => {
    (useKycLauncher as jest.Mock).mockReturnValueOnce({
      launchKycVerification: mockLaunchKycVerification,
      isKycAvailable: false,
      isLoading: false,
    });
    const { UNSAFE_queryByType } = render(<DocumentNFCTroubleScreen />);
    expect(UNSAFE_queryByType('mock-secondary-button')).toBeNull();
  });
});
