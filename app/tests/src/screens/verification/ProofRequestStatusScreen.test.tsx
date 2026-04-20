// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import ProofRequestStatusScreen from '@/screens/verification/ProofRequestStatusScreen';
import { ProofStatus } from '@/stores/proofTypes';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-view': any;
      'mock-text': any;
      'mock-button': any;
      'mock-spinner': any;
      'mock-lottie': any;
      'mock-layout': any;
      'mock-top': any;
      'mock-bottom': any;
      'mock-scroll': any;
    }
  }
}

jest.mock('react-native', () => ({
  __esModule: true,
  Linking: {
    openURL: jest.fn(),
  },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
  },
  View: ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  ),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('tamagui', () => ({
  __esModule: true,
  ScrollView: ({ children, ...props }: any) => (
    <mock-scroll {...props}>{children}</mock-scroll>
  ),
  Spinner: (props: any) => <mock-spinner {...props} />,
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/colors', () => ({
  black: '#000000',
  white: '#ffffff',
}));

jest.mock('@selfxyz/mobile-sdk-alpha/constants/analytics', () => ({
  ProofEvents: {
    PROOF_COMPLETED: 'PROOF_COMPLETED',
    PROOF_FAILED: 'PROOF_FAILED',
    PROOF_RESULT_ACKNOWLEDGED: 'PROOF_RESULT_ACKNOWLEDGED',
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha/animations/loading/misc.json', () => ({}));
jest.mock('@/assets/animations/proof_failed.json', () => ({}));
jest.mock('@/assets/animations/proof_success.json', () => ({}));

jest.mock('@selfxyz/mobile-sdk-alpha/components', () => ({
  BodyText: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  Description: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  PrimaryButton: ({ children, onPress, disabled, ...props }: any) => (
    <mock-button
      testID="primary-button"
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      {children}
    </mock-button>
  ),
  Title: ({ children, ...props }: any) => (
    <mock-text {...props}>{children}</mock-text>
  ),
  typography: {
    strong: {},
  },
}));

jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  DelayedLottieView: (props: any) => <mock-lottie {...props} />,
  useSelfClient: jest.fn(),
}));

jest.mock('@/hooks/useHapticNavigation', () => jest.fn());

jest.mock('@/integrations/haptics', () => ({
  buttonTap: jest.fn(),
  notificationError: jest.fn(),
  notificationSuccess: jest.fn(),
}));

jest.mock('@/layouts/ExpandableBottomLayout', () => ({
  ExpandableBottomLayout: {
    Layout: ({ children, ...props }: any) => (
      <mock-layout {...props}>{children}</mock-layout>
    ),
    TopSection: ({ children, ...props }: any) => (
      <mock-top {...props}>{children}</mock-top>
    ),
    BottomSection: ({ children, ...props }: any) => (
      <mock-bottom {...props}>{children}</mock-bottom>
    ),
  },
}));

jest.mock('@/services/points/utils', () => ({
  getWhiteListedDisclosureAddresses: jest.fn(),
}));

jest.mock('@/services/points', () => ({
  hasUserAnIdentityDocumentRegistered: jest.fn(),
  hasUserDoneThePointsDisclosure: jest.fn(),
}));

jest.mock('@/stores/proofHistoryStore', () => ({
  useProofHistoryStore: jest.fn(),
}));

const { Linking } = jest.requireMock('react-native') as {
  Linking: {
    openURL: jest.Mock;
  };
};
const { useSelfClient } = jest.requireMock('@selfxyz/mobile-sdk-alpha') as {
  useSelfClient: jest.Mock;
};
const useHapticNavigation = jest.requireMock(
  '@/hooks/useHapticNavigation',
) as jest.Mock;
const { buttonTap, notificationSuccess } = jest.requireMock(
  '@/integrations/haptics',
) as {
  buttonTap: jest.Mock;
  notificationSuccess: jest.Mock;
};
const { getWhiteListedDisclosureAddresses } = jest.requireMock(
  '@/services/points/utils',
) as {
  getWhiteListedDisclosureAddresses: jest.Mock;
};
const { hasUserAnIdentityDocumentRegistered, hasUserDoneThePointsDisclosure } =
  jest.requireMock('@/services/points') as {
    hasUserAnIdentityDocumentRegistered: jest.Mock;
    hasUserDoneThePointsDisclosure: jest.Mock;
  };
const { useProofHistoryStore } = jest.requireMock(
  '@/stores/proofHistoryStore',
) as {
  useProofHistoryStore: jest.Mock;
};

describe('ProofRequestStatusScreen', () => {
  const mockGoHome = jest.fn();
  const mockNavigate = jest.fn();
  const mockTrackEvent = jest.fn();
  const mockCleanSelfApp = jest.fn();
  const mockUpdateProofStatus = jest.fn();

  let provingState: {
    currentState: string;
    reason: string | null;
    uuid: string;
    error_code: string | null;
  };
  let selfAppState: {
    selfApp: {
      appName: string;
      deeplinkCallback: string | null;
      endpoint?: string | null;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    provingState = {
      currentState: 'completed',
      reason: null,
      uuid: 'session-1',
      error_code: null,
    };
    selfAppState = {
      selfApp: {
        appName: 'Verifier',
        deeplinkCallback: null,
        endpoint: null,
      },
    };

    (useIsFocused as jest.Mock).mockReturnValue(true);
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
    useHapticNavigation.mockReturnValue(mockGoHome);
    useProofHistoryStore.mockReturnValue({
      updateProofStatus: mockUpdateProofStatus,
    });
    getWhiteListedDisclosureAddresses.mockResolvedValue([]);
    hasUserAnIdentityDocumentRegistered.mockResolvedValue(true);
    hasUserDoneThePointsDisclosure.mockResolvedValue(true);

    const useProvingStore = Object.assign(
      (selector: (state: typeof provingState) => unknown) =>
        selector(provingState),
      {
        getState: () => provingState,
      },
    );
    const useSelfAppStore = (
      selector: (state: typeof selfAppState) => unknown,
    ) => selector(selfAppState);

    useSelfClient.mockReturnValue({
      trackEvent: mockTrackEvent,
      getSelfAppState: () => ({ cleanSelfApp: mockCleanSelfApp }),
      useProvingStore,
      useSelfAppStore,
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('goes home and clears the completed session after acknowledgement', async () => {
    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(mockUpdateProofStatus).toHaveBeenCalledWith(
        'session-1',
        ProofStatus.SUCCESS,
      );
    });

    fireEvent.press(screen.getByTestId('primary-button'));

    expect(buttonTap).toHaveBeenCalledTimes(1);
    expect(mockGoHome).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockCleanSelfApp).toHaveBeenCalledTimes(1);
    expect(notificationSuccess).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith('PROOF_COMPLETED', {
      sessionId: 'session-1',
      appName: 'Verifier',
    });
  });

  it('navigates to Gratification when the endpoint is whitelisted for points', async () => {
    selfAppState.selfApp.endpoint = '0xABC';
    getWhiteListedDisclosureAddresses.mockResolvedValue([
      {
        contract_address: '0xabc',
        points_per_disclosure: 25,
      },
    ]);

    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(getWhiteListedDisclosureAddresses).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Gratification', {
        points: 25,
      });
    });
    expect(mockGoHome).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockCleanSelfApp).toHaveBeenCalledTimes(1);
  });

  it('falls back to Home when whitelisted but points prerequisites are not met', async () => {
    selfAppState.selfApp.endpoint = '0xABC';
    getWhiteListedDisclosureAddresses.mockResolvedValue([
      {
        contract_address: '0xabc',
        points_per_disclosure: 25,
      },
    ]);
    hasUserDoneThePointsDisclosure.mockResolvedValue(false);

    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(getWhiteListedDisclosureAddresses).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(mockGoHome).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      'Gratification',
      expect.anything(),
    );

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockCleanSelfApp).toHaveBeenCalledTimes(1);
  });

  it('does not clear self app state if a newer session replaces the completed one', async () => {
    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(mockUpdateProofStatus).toHaveBeenCalled();
    });

    fireEvent.press(screen.getByTestId('primary-button'));
    provingState.uuid = 'session-2';

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockCleanSelfApp).not.toHaveBeenCalled();
  });

  it('cancels deeplink redirect before it opens the external URL', async () => {
    selfAppState.selfApp.deeplinkCallback =
      'https://callback.self.xyz/complete';

    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('primary-button').props.children).toBe(
        'Cancel',
      );
    });

    fireEvent.press(screen.getByTestId('primary-button'));
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(Linking.openURL).not.toHaveBeenCalled();
    expect(mockGoHome).not.toHaveBeenCalled();
  });
});
