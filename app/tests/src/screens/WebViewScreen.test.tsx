// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useNavigation } from '@react-navigation/native';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import { WebViewScreen } from '@/screens/shared/WebViewScreen';

jest.mock('react-native', () => {
  const mockLinking = {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  };

  const MockView = ({ children, ...props }: any) => (
    <mock-view {...props}>{children}</mock-view>
  );
  const mockBackHandler = {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
  };

  return {
    ActivityIndicator: (props: any) => <mock-activity-indicator {...props} />,
    BackHandler: mockBackHandler,
    Linking: mockLinking,
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown) => style,
    },
    View: MockView,
  };
});

const mockLinking = jest.requireMock('react-native').Linking as jest.Mocked<{
  canOpenURL: jest.Mock;
  openURL: jest.Mock;
}>;

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/components/navbar/WebViewNavBar', () => ({
  WebViewNavBar: ({ children, onBackPress, ...props }: any) => (
    <mock-webview-navbar {...props}>
      <mock-pressable testID="icon-x" onPress={onBackPress} />
      {children}
    </mock-webview-navbar>
  ),
}));

jest.mock('@/components/WebViewFooter', () => ({
  WebViewFooter: () => <mock-webview-footer />,
}));

jest.mock('@/layouts/ExpandableBottomLayout', () => ({
  ExpandableBottomLayout: {
    Layout: ({ children, ...props }: any) => (
      <mock-expandable-layout {...props}>{children}</mock-expandable-layout>
    ),
    TopSection: ({ children, ...props }: any) => (
      <mock-expandable-top {...props}>{children}</mock-expandable-top>
    ),
    BottomSection: ({ children, ...props }: any) => (
      <mock-expandable-bottom {...props}>{children}</mock-expandable-bottom>
    ),
  },
}));

jest.mock('react-native-webview', () => {
  // Lightweight host component so React can render while keeping props inspectable
  const MockWebView = ({ testID = 'webview', ...props }: any) => (
    <mock-webview testID={testID} {...props} />
  );
  MockWebView.displayName = 'MockWebView';
  return {
    __esModule: true,
    default: MockWebView,
    WebView: MockWebView,
  };
});

const mockGoBack = jest.fn();

describe('WebViewScreen URL sanitization and navigation interception', () => {
  const createProps = (initialUrl?: string, title?: string) => {
    return {
      navigation: {
        goBack: jest.fn(),
        canGoBack: jest.fn(() => true),
      } as any,
      route: {
        key: 'WebView-1',
        name: 'WebView',
        params: initialUrl
          ? { url: initialUrl, title }
          : { url: 'https://self.xyz', title },
      } as any,
    };
  };

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
      canGoBack: () => true,
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockLinking.canOpenURL.mockReset();
    mockLinking.openURL.mockReset();
  });

  afterEach(() => {
    jest.resetAllMocks();
    (console.error as jest.Mock).mockRestore?.();
  });

  it('navigates back when close button is pressed', () => {
    render(<WebViewScreen {...createProps('https://self.xyz')} />);
    // The Button component renders with msdk-button testID, find by icon
    const closeButtonIcon = screen.getByTestId('icon-x');
    fireEvent.press(closeButtonIcon);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('sanitizes initial non-http(s) url and uses default', () => {
    render(<WebViewScreen {...createProps('intent://foo')} />);
    const webview = screen.getByTestId('webview');
    expect(webview.props.source).toEqual({ uri: 'https://self.xyz' });

    // Title falls back to currentUrl (uppercase via NavBar), i.e., defaultUrl
    // We can't easily select NavBar text here without its internals; instead,
    // verify current source reflects the defaultUrl which the title derives from
  });

  it('keeps currentUrl unchanged on non-http(s) navigation update', () => {
    render(<WebViewScreen {...createProps('http://example.com')} />);
    const webview = screen.getByTestId('webview');
    // simulate a navigation update with disallowed scheme
    webview.props.onNavigationStateChange?.({
      url: 'intent://foo',
      canGoBack: true,
      canGoForward: false,
      navigationType: 'other',
      title: undefined,
    });
    // Source remains the initial http URL since non-http(s) updates are ignored for currentUrl
    expect(webview.props.source).toEqual({ uri: 'http://example.com' });
  });

  it('allows http(s) navigation via onShouldStartLoadWithRequest', () => {
    render(<WebViewScreen {...createProps('https://example.com')} />);
    const webview = screen.getByTestId('webview');
    const allowed = webview.props.onShouldStartLoadWithRequest?.({
      url: 'https://example.org',
    });
    expect(allowed).toBe(true);
  });

  it('opens allowed external schemes externally and blocks in WebView (mailto, tel)', async () => {
    mockLinking.canOpenURL.mockResolvedValue(true as any);
    mockLinking.openURL.mockResolvedValue(undefined as any);
    render(<WebViewScreen {...createProps('https://self.xyz')} />);
    const webview = screen.getByTestId('webview');

    const resultMailto = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'mailto:test@example.com',
    });
    expect(resultMailto).toBe(false);
    await waitFor(() =>
      expect(mockLinking.openURL).toHaveBeenCalledWith(
        'mailto:test@example.com',
      ),
    );

    const resultTel = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'tel:+123456789',
    });
    expect(resultTel).toBe(false);
    await waitFor(() =>
      expect(mockLinking.openURL).toHaveBeenCalledWith('tel:+123456789'),
    );
  });

  it('blocks disallowed external schemes and does not attempt to open', async () => {
    render(<WebViewScreen {...createProps('https://self.xyz')} />);
    const webview = screen.getByTestId('webview');

    const result = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'ftp://example.com',
    });
    expect(result).toBe(false);
    expect(mockLinking.canOpenURL).not.toHaveBeenCalled();
    expect(mockLinking.openURL).not.toHaveBeenCalled();
  });

  it('scrubs error log wording when external open fails', async () => {
    mockLinking.canOpenURL.mockResolvedValue(true as any);
    mockLinking.openURL.mockRejectedValue(new Error('boom'));
    render(<WebViewScreen {...createProps('https://self.xyz')} />);
    const webview = screen.getByTestId('webview');

    const result = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'mailto:test@example.com',
    });
    expect(result).toBe(false);
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    const [msg] = (console.error as jest.Mock).mock.calls[0];
    expect(String(msg)).toContain('Failed to open externally');
    expect(String(msg)).not.toMatch(/Failed to open URL externally/);
  });
});
