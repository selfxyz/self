// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { act, render } from '@testing-library/react-native';

import WebViewHostScreen from '@/screens/dev/WebViewHostScreen';

const mockSelfVerificationProps: { current: any } = { current: null };
jest.mock('@selfxyz/rn-sdk', () => ({
  __esModule: true,
  SelfVerification: (props: any) => {
    mockSelfVerificationProps.current = props;
    return null;
  },
}));

const mockHandleProofResult = jest.fn();
const mockCleanSelfApp = jest.fn();
const mockSelfAppState: { sessionId: string | null } = { sessionId: 'session-1' };
jest.mock('@selfxyz/mobile-sdk-alpha', () => ({
  __esModule: true,
  useSelfClient: () => ({
    getSelfAppState: () => ({
      sessionId: mockSelfAppState.sessionId,
      handleProofResult: mockHandleProofResult,
      cleanSelfApp: mockCleanSelfApp,
    }),
  }),
}));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  __esModule: true,
  useNavigation: () => ({ goBack: mockGoBack, canGoBack: () => true }),
  useRoute: () => ({ params: { request: { verificationId: 'session-1' } } }),
}));

const mockTrackEvent = jest.fn();
jest.mock('@/services/analytics', () => ({
  __esModule: true,
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
  trackNfcEvent: jest.fn(),
}));

jest.mock('@/config/sentry', () => ({
  __esModule: true,
  captureWebViewLoadDiagnostic: jest.fn(),
  clearReferenceTag: jest.fn(),
  setReferenceTag: jest.fn(),
}));

jest.mock('@/providers/passportDataProvider', () => ({
  __esModule: true,
  selfClientDocumentsAdapter: {
    loadDocumentCatalog: jest.fn(),
    saveDocumentCatalog: jest.fn(),
    loadDocumentById: jest.fn(),
    saveDocument: jest.fn(),
    deleteDocument: jest.fn(),
  },
}));

jest.mock('@/screens/dev/WebViewHostOverlays', () => ({
  __esModule: true,
  WebViewErrorOverlay: () => null,
  WebViewLoadingOverlay: () => null,
}));

jest.mock('expo-file-system', () => ({
  __esModule: true,
  Paths: { bundle: { uri: 'file:///bundle' } },
}));

jest.mock('react-native', () => ({
  __esModule: true,
  Platform: { OS: 'ios', select: jest.fn() },
  View: ({ children }: any) => children ?? null,
}));

describe('WebViewHostScreen relayer result handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelfAppState.sessionId = 'session-1';
    mockSelfVerificationProps.current = null;
  });

  it('emits proof_verified to the relayer on success and navigates back', () => {
    render(<WebViewHostScreen />);

    act(() => {
      mockSelfVerificationProps.current.onSuccess({ success: true });
    });

    expect(mockHandleProofResult).toHaveBeenCalledWith(true, undefined, undefined);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('emits proof_generation_failed with the error details on failure', () => {
    render(<WebViewHostScreen />);

    act(() => {
      mockSelfVerificationProps.current.onFailure({
        code: 'timeout',
        message: 'took too long',
      });
    });

    expect(mockHandleProofResult).toHaveBeenCalledWith(
      false,
      'timeout',
      'took too long',
    );
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('does not emit when the socket tracks a different session', () => {
    mockSelfAppState.sessionId = 'stale-session';
    render(<WebViewHostScreen />);

    act(() => {
      mockSelfVerificationProps.current.onSuccess({ success: true });
    });

    expect(mockHandleProofResult).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'webview_relayer_session_mismatch',
      expect.objectContaining({
        request_session: 'session-1',
        socket_session: 'stale-session',
      }),
    );
  });

  it('tears down the relayer socket on unmount', () => {
    const { unmount } = render(<WebViewHostScreen />);
    unmount();
    expect(mockCleanSelfApp).toHaveBeenCalled();
  });
});
