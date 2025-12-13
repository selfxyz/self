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
import {
  DISALLOWED_SCHEMES,
  isSameOrigin,
  isTrustedDomain,
  TRUSTED_DOMAINS,
} from '@/utils/webview';

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
    Platform: {
      OS: 'ios',
      select: (specifics: { ios?: unknown; android?: unknown }) =>
        specifics.ios ?? specifics.android,
    },
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
    // Non-trusted URL falls back to https://self.xyz, non-http(s) updates are ignored for currentUrl
    expect(webview.props.source).toEqual({ uri: 'https://self.xyz' });
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

describe('WebViewScreen same-origin security', () => {
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
      goBack: jest.fn(),
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

  describe('TRUSTED_DOMAINS whitelist', () => {
    it('includes self.xyz base domain', () => {
      expect(TRUSTED_DOMAINS).toContain('self.xyz');
    });

    it('includes known partner domains', () => {
      // Figma game site - TODO: migrate to self.xyz subdomain
      expect(TRUSTED_DOMAINS).toContain('amity-lock-11401309.figma.site');
    });
  });

  describe('DISALLOWED_SCHEMES blacklist', () => {
    it('includes dangerous schemes that should be blocked', () => {
      expect(DISALLOWED_SCHEMES).toContain('ftp://');
      expect(DISALLOWED_SCHEMES).toContain('file://');
      // eslint-disable-next-line no-script-url
      expect(DISALLOWED_SCHEMES).toContain('javascript:');
    });
  });

  describe('isTrustedDomain helper function', () => {
    it('returns true for self.xyz base domain', () => {
      expect(isTrustedDomain('https://self.xyz')).toBe(true);
    });

    it('returns true for self.xyz subdomains', () => {
      expect(isTrustedDomain('https://apps.self.xyz')).toBe(true);
      expect(isTrustedDomain('https://docs.self.xyz')).toBe(true);
      expect(isTrustedDomain('https://games.self.xyz/path')).toBe(true);
    });

    it('returns true for whitelisted partner domains', () => {
      expect(isTrustedDomain('https://amity-lock-11401309.figma.site')).toBe(
        true,
      );
      expect(
        isTrustedDomain('https://amity-lock-11401309.figma.site/page'),
      ).toBe(true);
    });

    it('returns false for non-whitelisted domains', () => {
      expect(isTrustedDomain('https://malicious.com')).toBe(false);
      expect(isTrustedDomain('https://phishing-self.xyz')).toBe(false);
      expect(isTrustedDomain('https://figma.site')).toBe(false); // Parent domain not allowed
    });

    it('returns false for malformed URLs', () => {
      expect(isTrustedDomain('not-a-url')).toBe(false);
      expect(isTrustedDomain('')).toBe(false);
    });
  });

  describe('isSameOrigin helper function', () => {
    it('returns true for same origin URLs', () => {
      expect(
        isSameOrigin('https://apps.self.xyz', 'https://apps.self.xyz/page'),
      ).toBe(true);
    });

    it('returns true for same origin with different paths', () => {
      expect(
        isSameOrigin(
          'https://apps.self.xyz/foo',
          'https://apps.self.xyz/bar/baz',
        ),
      ).toBe(true);
    });

    it('returns true for same origin with query params', () => {
      expect(
        isSameOrigin(
          'https://apps.self.xyz?a=1',
          'https://apps.self.xyz/page?b=2',
        ),
      ).toBe(true);
    });

    it('returns false for different subdomains', () => {
      expect(
        isSameOrigin('https://apps.self.xyz', 'https://docs.self.xyz'),
      ).toBe(false);
    });

    it('returns false for different protocols', () => {
      expect(
        isSameOrigin('https://apps.self.xyz', 'http://apps.self.xyz'),
      ).toBe(false);
    });

    it('returns false for different domains', () => {
      expect(
        isSameOrigin('https://apps.self.xyz', 'https://malicious.com'),
      ).toBe(false);
    });

    it('returns false for malformed URLs', () => {
      expect(isSameOrigin('not-a-url', 'https://apps.self.xyz')).toBe(false);
      expect(isSameOrigin('https://apps.self.xyz', '')).toBe(false);
    });
  });

  describe('onShouldStartLoadWithRequest trusted domain policy', () => {
    it('allows initial URL to load', () => {
      const initialUrl = 'https://apps.self.xyz';
      render(<WebViewScreen {...createProps(initialUrl)} />);
      const webview = screen.getByTestId('webview');

      const result = webview.props.onShouldStartLoadWithRequest?.({
        url: initialUrl,
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows navigation within trusted self.xyz domains', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Different self.xyz subdomain - allowed because self.xyz is trusted
      const result = webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://docs.self.xyz/guide',
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows navigation to whitelisted partner domains', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Whitelisted Figma game site
      const result = webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://amity-lock-11401309.figma.site',
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows HTTPS navigation to untrusted domains after trusted entry (parent-trusted session)', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const result = webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://external-site.com',
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows HTTPS JS redirects after trusted entry (parent-trusted session)', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const result = webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://malicious-phishing.com',
        navigationType: 'other', // JS redirect, not a click
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows about:blank/srcdoc during trusted session (wallet bootstrap)', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const resultBlank = webview.props.onShouldStartLoadWithRequest?.({
        url: 'about:blank',
      });
      expect(resultBlank).toBe(true);

      const resultSrcdoc = webview.props.onShouldStartLoadWithRequest?.({
        url: 'about:srcdoc',
      });
      expect(resultSrcdoc).toBe(true);

      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('onOpenWindow security', () => {
    it('loads trusted domain target="_blank" links in current WebView', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'https://docs.self.xyz',
        },
      });

      // Trusted domains should NOT open externally - they navigate within the WebView
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('loads trusted partner domain target="_blank" links in current WebView', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'https://amity-lock-11401309.figma.site',
        },
      });

      // Trusted partner domains (like figma game) should NOT open externally
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows HTTPS target="_blank" links in trusted session (parent-trusted model)', () => {
      // When starting from a trusted domain (apps.self.xyz), HTTPS child navigations
      // via window.open should stay in the WebView per the parent-trusted session model
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'https://external-site.com',
        },
      });

      // Parent-trusted session: HTTPS links should NOT open externally
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows about:blank/srcdoc target="_blank" during trusted session without external open', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'about:blank',
        },
      });

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'about:srcdoc',
        },
      });

      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('handles empty targetUrl gracefully', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      expect(() => {
        webview.props.onOpenWindow?.({
          nativeEvent: {
            targetUrl: undefined,
          },
        });
      }).not.toThrow();

      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });
  });
});
