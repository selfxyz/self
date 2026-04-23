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
      'mock-rn-text': any;
    }
  }
}

jest.mock('react-native', () => ({
  __esModule: true,
  Linking: {
    openURL: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: (spec: { ios?: unknown; android?: unknown; default?: unknown }) =>
      spec.ios ?? spec.default,
  },
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
  },
  View: ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  ),
  Text: ({ children, ...props }: any) => (
    <mock-rn-text {...props}>{children}</mock-rn-text>
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
  slate200: '#E2E8F0',
  slate500: '#64748B',
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

jest.mock('@/config/sentry', () => ({
  captureException: jest.fn(),
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
const { captureException } = jest.requireMock('@/config/sentry') as {
  captureException: jest.Mock;
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
  const mockCancelProof = jest.fn();

  let provingState: {
    currentState: string;
    reason: string | null;
    uuid: string;
    error_code: string | null;
    cancel: jest.Mock;
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
    mockCancelProof.mockReset();
    mockCancelProof.mockResolvedValue(undefined);

    provingState = {
      currentState: 'completed',
      reason: null,
      uuid: 'session-1',
      error_code: null,
      cancel: mockCancelProof,
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

  it('keeps the button disabled on completed while whitelist fetch is pending', async () => {
    selfAppState.selfApp.endpoint = '0xABC';
    // Simulate a never-resolving whitelist lookup to hold whitelistedPoints === undefined.
    getWhiteListedDisclosureAddresses.mockImplementation(
      () => new Promise(() => {}),
    );

    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(getWhiteListedDisclosureAddresses).toHaveBeenCalledTimes(1);
    });

    const button = screen.getByTestId('primary-button');
    expect(button.props.disabled).toBe(true);

    fireEvent.press(button);

    expect(buttonTap).not.toHaveBeenCalled();
    expect(mockGoHome).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockCleanSelfApp).not.toHaveBeenCalled();
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

  it('falls back to Home when a prerequisite check stalls past the timeout', async () => {
    selfAppState.selfApp.endpoint = '0xABC';
    getWhiteListedDisclosureAddresses.mockResolvedValue([
      {
        contract_address: '0xabc',
        points_per_disclosure: 25,
      },
    ]);
    // Simulate a hung network call — never resolves.
    hasUserDoneThePointsDisclosure.mockImplementation(
      () => new Promise(() => {}),
    );

    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(getWhiteListedDisclosureAddresses).toHaveBeenCalledTimes(1);
    });

    fireEvent.press(screen.getByTestId('primary-button'));

    // Advance past the 3s prereq timeout.
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

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

  describe('failure / error', () => {
    it('shows Dismiss on failure and routing Home clears session on press', async () => {
      provingState.currentState = 'failure';
      provingState.reason = '[InvalidRoot]: Onchain root does not exist';

      render(<ProofRequestStatusScreen />);

      const button = screen.getByTestId('primary-button');
      expect(button.props.children).toBe('Dismiss');
      expect(button.props.disabled).toBe(false);

      fireEvent.press(button);

      expect(buttonTap).toHaveBeenCalledTimes(1);
      expect(mockGoHome).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockCleanSelfApp).toHaveBeenCalledTimes(1);
    });

    it('shows Dismiss on error and still exits even without a reason', async () => {
      provingState.currentState = 'error';
      provingState.reason = null;

      render(<ProofRequestStatusScreen />);

      const button = screen.getByTestId('primary-button');
      expect(button.props.children).toBe('Dismiss');

      fireEvent.press(button);

      expect(mockGoHome).toHaveBeenCalledTimes(1);
    });

    it('renders the QR-refresh copy for InvalidRoot failures', async () => {
      provingState.currentState = 'failure';
      provingState.reason =
        '[InvalidRoot]: Onchain root does not exist, received: 4589...';

      const { toJSON } = render(<ProofRequestStatusScreen />);

      const tree = JSON.stringify(toJSON());
      expect(tree).toMatch(/QR code from Verifier is out of date/i);
    });

    it('renders a fallback copy for unknown failure reasons', async () => {
      provingState.currentState = 'failure';
      provingState.reason = 'Something else went wrong';

      const { toJSON } = render(<ProofRequestStatusScreen />);

      const tree = JSON.stringify(toJSON());
      expect(tree).toMatch(
        /Unable to prove your identity to Verifier\. Please try again/i,
      );
    });

    it('renders the raw reason in the selectable details box for support', async () => {
      const reason =
        '[InvalidRoot]: Onchain root does not exist, received: 4589506917688709078187632663628833702807225';
      provingState.currentState = 'failure';
      provingState.reason = reason;

      const { toJSON } = render(<ProofRequestStatusScreen />);

      const tree = JSON.stringify(toJSON());
      expect(tree).toContain(reason);
      expect(tree).toContain('Details');
      // The raw reason must be selectable so users/support can copy it.
      expect(tree).toMatch(/"selectable":true/);
    });
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

  it('times out stalled proving on mount and lets the user dismiss safely', async () => {
    provingState.currentState = 'proving';

    const { toJSON } = render(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('primary-button').props.children).toBe(
        'Dismiss',
      );
    });

    const tree = JSON.stringify(toJSON());
    expect(tree).toMatch(/took too long to finish/i);
    expect(tree).toContain('timed_out_after_90s');
    expect(mockUpdateProofStatus).toHaveBeenCalledWith(
      'session-1',
      ProofStatus.FAILURE,
      'proof_timeout',
      'timed_out_after_90s',
    );

    await act(async () => {
      fireEvent.press(screen.getByTestId('primary-button'));
    });

    await waitFor(() => {
      expect(mockCancelProof).toHaveBeenCalledTimes(1);
    });
    expect(mockCleanSelfApp).toHaveBeenCalledTimes(1);
    expect(mockGoHome).toHaveBeenCalledTimes(1);
  });

  it('does not write proof history when timeout fires before a session id exists', async () => {
    provingState.currentState = 'fetching_data';
    provingState.uuid = null as any;

    render(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('primary-button').props.children).toBe(
        'Dismiss',
      );
    });

    expect(mockUpdateProofStatus).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith('PROOF_FAILED', {
      sessionId: null,
      appName: 'Verifier',
      errorCode: 'proof_timeout',
      reason: 'timed_out_after_90s',
      state: 'timeout',
    });
  });

  it('does not write proof history for early completion without a session id', async () => {
    provingState.currentState = 'completed';
    provingState.uuid = null as any;

    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('PROOF_COMPLETED', {
        sessionId: null,
        appName: 'Verifier',
      });
    });

    expect(mockUpdateProofStatus).not.toHaveBeenCalled();
  });

  it('does not write proof history for early failure without a session id', async () => {
    provingState.currentState = 'error';
    provingState.uuid = null as any;
    provingState.error_code = 'early_error';
    provingState.reason = 'failed before tee';

    render(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('PROOF_FAILED', {
        sessionId: null,
        appName: 'Verifier',
        errorCode: 'early_error',
        reason: 'failed before tee',
        state: 'error',
      });
    });

    expect(mockUpdateProofStatus).not.toHaveBeenCalled();
  });

  it('times out when stuck in post_proving', async () => {
    provingState.currentState = 'post_proving';

    render(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('primary-button').props.children).toBe(
        'Dismiss',
      );
    });
  });

  it('does not schedule delayed cleanup when acknowledging a failure with no session id', async () => {
    provingState.currentState = 'failure';
    provingState.uuid = null as any;
    provingState.reason = 'early failure';

    render(<ProofRequestStatusScreen />);

    fireEvent.press(screen.getByTestId('primary-button'));

    expect(mockGoHome).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockCleanSelfApp).not.toHaveBeenCalled();
  });

  it('resets the stall timer when the proving state changes', async () => {
    provingState.currentState = 'fetching_data';
    const { rerender } = render(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(89_000);
    });

    expect(screen.queryByText('Proof Failed')).toBeNull();

    provingState.currentState = 'proving';
    rerender(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    expect(screen.queryByText('Proof Failed')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(88_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('primary-button').props.children).toBe(
        'Dismiss',
      );
    });
  });

  it('resets timeout state when a new session id arrives', async () => {
    provingState.currentState = 'proving';
    const { rerender } = render(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('primary-button').props.children).toBe(
        'Dismiss',
      );
    });

    provingState.uuid = 'session-2';
    rerender(<ProofRequestStatusScreen />);

    await waitFor(() => {
      expect(screen.queryByText('timed_out_after_90s')).toBeNull();
    });
    expect(screen.getByTestId('primary-button').props.children).not.toBe(
      'Dismiss',
    );
  });

  it('clears the stall timer when the screen loses focus', () => {
    let focused = true;
    (useIsFocused as jest.Mock).mockImplementation(() => focused);
    provingState.currentState = 'proving';

    const { rerender } = render(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(45_000);
    });

    focused = false;
    rerender(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    expect(screen.queryByText('Proof Failed')).toBeNull();
  });

  it('still exits home if cancelling a timed-out proof throws', async () => {
    provingState.currentState = 'proving';
    mockCancelProof.mockRejectedValueOnce(new Error('close failed'));

    render(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('primary-button').props.children).toBe(
        'Dismiss',
      );
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('primary-button'));
    });

    await waitFor(() => {
      expect(mockGoHome).toHaveBeenCalledTimes(1);
    });
    expect(mockCleanSelfApp).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated dismiss taps while timed-out cancellation is in flight', async () => {
    provingState.currentState = 'proving';
    mockCancelProof.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 10)),
    );

    render(<ProofRequestStatusScreen />);

    act(() => {
      jest.advanceTimersByTime(90_000);
    });

    await waitFor(() => {
      expect(screen.getByTestId('primary-button').props.children).toBe(
        'Dismiss',
      );
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('primary-button'));
      fireEvent.press(screen.getByTestId('primary-button'));
      jest.advanceTimersByTime(10);
    });

    expect(mockCancelProof).toHaveBeenCalledTimes(1);
  });
});
