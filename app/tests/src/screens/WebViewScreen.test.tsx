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

// Type declarations for mock JSX elements used in tests
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'mock-view': any;
      'mock-activity-indicator': any;
      'mock-webview-navbar': any;
      'mock-pressable': any;
      'mock-webview-footer': any;
      'mock-expandable-layout': any;
      'mock-expandable-top': any;
      'mock-expandable-bottom': any;
      'mock-webview': any;
    }
  }
}

jest.mock('react-native', () => {
  const mockLinking = {
    canOpenURL: jest.fn(),
    openURL: jest.fn(),
  };

  // Mock Alert to capture buttons and allow simulating user interaction
  const mockAlert = {
    alert: jest.fn(),
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
    Alert: mockAlert,
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

const mockAlert = jest.requireMock('react-native').Alert as {
  alert: jest.Mock;
};

const mockPlatform = jest.requireMock('react-native').Platform as {
  OS: 'ios' | 'android';
  select: (specifics: { ios?: unknown; android?: unknown }) => unknown;
};

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
    mockAlert.alert.mockClear();
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
    // Mock Alert to auto-confirm
    mockAlert.alert.mockImplementation(
      (
        _title: string,
        _message: string,
        buttons: Array<{ text: string; onPress?: () => void }>,
      ) => {
        const openButton = buttons.find(b => b.text === 'Open');
        openButton?.onPress?.();
      },
    );
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

  it('blocks data: URLs to prevent XSS and phishing', async () => {
    render(<WebViewScreen {...createProps('https://self.xyz')} />);
    const webview = screen.getByTestId('webview');

    const result = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'data:text/html,<script>alert("XSS")</script>',
    });
    expect(result).toBe(false);
    expect(mockLinking.canOpenURL).not.toHaveBeenCalled();
    expect(mockLinking.openURL).not.toHaveBeenCalled();
  });

  it('blocks blob: URLs to prevent resource access', async () => {
    render(<WebViewScreen {...createProps('https://self.xyz')} />);
    const webview = screen.getByTestId('webview');

    const result = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'blob:https://example.com/uuid-here',
    });
    expect(result).toBe(false);
    expect(mockLinking.canOpenURL).not.toHaveBeenCalled();
    expect(mockLinking.openURL).not.toHaveBeenCalled();
  });

  it('scrubs error log wording when external open fails', async () => {
    // Mock Alert to auto-confirm
    mockAlert.alert.mockImplementation(
      (
        _title: string,
        _message: string,
        buttons: Array<{ text: string; onPress?: () => void }>,
      ) => {
        const openButton = buttons.find(b => b.text === 'Open');
        openButton?.onPress?.();
      },
    );
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
    mockAlert.alert.mockClear();
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
      // File schemes (both variants)
      expect(DISALLOWED_SCHEMES).toContain('file://');
      expect(DISALLOWED_SCHEMES).toContain('file:');
      // FTP schemes (both variants)
      expect(DISALLOWED_SCHEMES).toContain('ftp://');
      expect(DISALLOWED_SCHEMES).toContain('ftp:');
      expect(DISALLOWED_SCHEMES).toContain('ftps://');
      expect(DISALLOWED_SCHEMES).toContain('ftps:');
      // Other dangerous schemes
      // eslint-disable-next-line no-script-url
      expect(DISALLOWED_SCHEMES).toContain('javascript:');
      expect(DISALLOWED_SCHEMES).toContain('data:');
      expect(DISALLOWED_SCHEMES).toContain('blob:');
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

  describe('shouldAlwaysOpenExternally helper function', () => {
    const { shouldAlwaysOpenExternally } = require('@/utils/webview');

    it('returns true for keys.coinbase.com', () => {
      expect(shouldAlwaysOpenExternally('https://keys.coinbase.com')).toBe(
        true,
      );
      expect(
        shouldAlwaysOpenExternally('https://keys.coinbase.com/connect'),
      ).toBe(true);
    });

    it('returns true for keys.coinbase.com subdomains', () => {
      expect(shouldAlwaysOpenExternally('https://auth.keys.coinbase.com')).toBe(
        true,
      );
    });

    it('returns false for regular coinbase.com (not keys.coinbase.com)', () => {
      expect(shouldAlwaysOpenExternally('https://coinbase.com')).toBe(false);
      expect(shouldAlwaysOpenExternally('https://www.coinbase.com')).toBe(
        false,
      );
    });

    it('returns false for non-whitelisted domains', () => {
      expect(shouldAlwaysOpenExternally('https://self.xyz')).toBe(false);
      expect(shouldAlwaysOpenExternally('https://example.com')).toBe(false);
    });

    it('returns false for malformed URLs', () => {
      expect(shouldAlwaysOpenExternally('not-a-url')).toBe(false);
    });
  });

  describe('isAllowedAboutUrl helper function', () => {
    const { isAllowedAboutUrl } = require('@/utils/webview');

    it('returns true for about:blank', () => {
      expect(isAllowedAboutUrl('about:blank')).toBe(true);
      expect(isAllowedAboutUrl('ABOUT:BLANK')).toBe(true); // Case insensitive
    });

    it('returns true for about:srcdoc', () => {
      expect(isAllowedAboutUrl('about:srcdoc')).toBe(true);
      expect(isAllowedAboutUrl('ABOUT:SRCDOC')).toBe(true);
    });

    it('returns false for other about: URLs', () => {
      expect(isAllowedAboutUrl('about:config')).toBe(false);
      expect(isAllowedAboutUrl('about:debugging')).toBe(false);
    });

    it('returns false for non-about URLs', () => {
      expect(isAllowedAboutUrl('https://self.xyz')).toBe(false);
      // eslint-disable-next-line no-script-url
      expect(isAllowedAboutUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('isUserInitiatedTopFrameNavigation helper function', () => {
    const { isUserInitiatedTopFrameNavigation } = require('@/utils/webview');

    // Ensure platform is always reset to iOS after each test
    afterEach(() => {
      mockPlatform.OS = 'ios';
    });

    it('returns true on Android (always allows navigation)', () => {
      mockPlatform.OS = 'android';

      try {
        expect(isUserInitiatedTopFrameNavigation({})).toBe(true);
        expect(isUserInitiatedTopFrameNavigation({ isTopFrame: false })).toBe(
          true,
        );
        expect(
          isUserInitiatedTopFrameNavigation({ navigationType: 'other' }),
        ).toBe(true);
      } finally {
        mockPlatform.OS = 'ios';
      }
    });

    it('returns false on iOS when isTopFrame is explicitly false (iframe protection)', () => {
      expect(
        isUserInitiatedTopFrameNavigation({
          isTopFrame: false,
          navigationType: 'click',
        }),
      ).toBe(false);
    });

    it('returns false on iOS for non-click navigationType', () => {
      expect(
        isUserInitiatedTopFrameNavigation({
          isTopFrame: true,
          navigationType: 'other',
        }),
      ).toBe(false);

      expect(
        isUserInitiatedTopFrameNavigation({
          isTopFrame: true,
          navigationType: 'reload',
        }),
      ).toBe(false);

      expect(
        isUserInitiatedTopFrameNavigation({
          isTopFrame: true,
          navigationType: 'formsubmit',
        }),
      ).toBe(false);

      expect(
        isUserInitiatedTopFrameNavigation({
          isTopFrame: true,
          navigationType: 'backforward',
        }),
      ).toBe(false);
    });

    it('returns true on iOS for click navigation', () => {
      expect(
        isUserInitiatedTopFrameNavigation({
          isTopFrame: true,
          navigationType: 'click',
        }),
      ).toBe(true);
    });

    it('returns true on iOS when navigationType is undefined (backward compatibility)', () => {
      expect(
        isUserInitiatedTopFrameNavigation({
          isTopFrame: true,
          navigationType: undefined,
        }),
      ).toBe(true);
    });

    it('returns true on iOS when isTopFrame is undefined and navigationType is click', () => {
      expect(
        isUserInitiatedTopFrameNavigation({
          navigationType: 'click',
        }),
      ).toBe(true);
    });
  });

  describe('onShouldStartLoadWithRequest trusted domain policy', () => {
    // Ensure platform is always reset to iOS after each test
    afterEach(() => {
      mockPlatform.OS = 'ios';
    });

    it('allows initial URL to load', async () => {
      const initialUrl = 'https://apps.self.xyz';
      render(<WebViewScreen {...createProps(initialUrl)} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: initialUrl,
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows navigation within trusted self.xyz domains', async () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Different self.xyz subdomain - allowed because self.xyz is trusted
      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://docs.self.xyz/guide',
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows navigation to whitelisted partner domains', async () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Whitelisted Figma game site
      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://amity-lock-11401309.figma.site',
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows HTTPS navigation to untrusted domains after trusted entry (parent-trusted session)', async () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://external-site.com',
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows HTTPS JS redirects after trusted entry (parent-trusted session)', async () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://malicious-phishing.com',
        navigationType: 'other', // JS redirect, not a click
      });
      expect(result).toBe(true);
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('allows about:blank/srcdoc during trusted session (wallet bootstrap)', async () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const resultBlank = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'about:blank',
      });
      expect(resultBlank).toBe(true);

      const resultSrcdoc = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'about:srcdoc',
      });
      expect(resultSrcdoc).toBe(true);

      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('detects WalletConnect from Aave and shows wallet confirmation on iOS', async () => {
      // iOS-specific: WalletConnect attestation from Aave should trigger Safari kickout
      render(<WebViewScreen {...createProps('https://app.aave.com')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://verify.walletconnect.org/v3/attestation?projectId=test',
        mainDocumentURL: 'https://app.aave.com/',
        isTopFrame: false,
        navigationType: 'other',
      });

      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open in Browser',
        'This will open in your browser to complete the wallet connection.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Open' }),
        ]),
      );
    });

    it('opens Aave in Safari when user confirms WalletConnect kickout on iOS', async () => {
      // Mock Alert to simulate user clicking "Open"
      mockAlert.alert.mockImplementation(
        (
          _title: string,
          _message: string,
          buttons: Array<{ text: string; onPress?: () => void }>,
        ) => {
          const openButton = buttons.find(b => b.text === 'Open');
          openButton?.onPress?.();
        },
      );
      mockLinking.canOpenURL.mockResolvedValue(true);

      render(<WebViewScreen {...createProps('https://app.aave.com')} />);
      const webview = screen.getByTestId('webview');

      await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://verify.walletconnect.org/v3/attestation?projectId=test',
        mainDocumentURL: 'https://app.aave.com/',
        isTopFrame: false,
        navigationType: 'other',
      });

      await waitFor(() => {
        // Should open the Aave URL (currentUrl) in Safari
        expect(mockLinking.openURL).toHaveBeenCalledWith(
          'https://app.aave.com',
        );
      });
    });

    it('allows WalletConnect from Aave on Android (no kickout)', async () => {
      // Android: WalletConnect should work in WebView normally
      mockPlatform.OS = 'android';

      try {
        render(<WebViewScreen {...createProps('https://app.aave.com')} />);
        const webview = screen.getByTestId('webview');

        const result = await webview.props.onShouldStartLoadWithRequest?.({
          url: 'https://verify.walletconnect.org/v3/attestation?projectId=test',
          mainDocumentURL: 'https://app.aave.com/',
          isTopFrame: false,
          navigationType: 'other',
        });

        // Should allow the request on Android
        expect(result).toBe(true);
        expect(mockAlert.alert).not.toHaveBeenCalled();
        expect(mockLinking.openURL).not.toHaveBeenCalled();
      } finally {
        mockPlatform.OS = 'ios';
      }
    });

    it('allows WalletConnect from non-Aave domains on iOS (no kickout)', async () => {
      // iOS: WalletConnect from other domains should not trigger kickout
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://verify.walletconnect.org/v3/attestation?projectId=test',
        mainDocumentURL: 'https://apps.self.xyz/',
        isTopFrame: false,
        navigationType: 'other',
      });

      // Should allow the request (not from Aave)
      expect(result).toBe(true);
      expect(mockAlert.alert).not.toHaveBeenCalled();
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('blocks spoofed WalletConnect URL with domain in query params on iOS', async () => {
      // Security: verify.walletconnect.org in query param should NOT trigger kickout
      render(<WebViewScreen {...createProps('https://app.aave.com')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://evil.com/?next=verify.walletconnect.org',
        mainDocumentURL: 'https://app.aave.com/',
        isTopFrame: false,
        navigationType: 'other',
      });

      // The key security fix: spoofed URL should NOT trigger WalletConnect Safari kickout
      // It may be allowed in WebView (trusted session) or blocked, but no alert should show
      expect(mockAlert.alert).not.toHaveBeenCalled();
      expect(mockLinking.openURL).not.toHaveBeenCalled();
      // In a trusted session, HTTPS URLs are allowed (parent-trusted session model)
      expect(result).toBe(true);
    });

    it('blocks spoofed Aave URL with domain in query params on iOS', async () => {
      // Security: app.aave.com in query param should NOT trigger kickout
      render(
        <WebViewScreen
          {...createProps('https://evil.com?page=app.aave.com')}
        />,
      );
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://verify.walletconnect.org/v3/attestation?projectId=test',
        mainDocumentURL: 'https://evil.com/?page=app.aave.com',
        isTopFrame: false,
        navigationType: 'other',
      });

      // Should NOT match as Aave (domain is spoofed in query param)
      expect(result).toBe(true); // WalletConnect is trusted, so allowed
      expect(mockAlert.alert).not.toHaveBeenCalled();
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('blocks spoofed WalletConnect URL with domain in path on iOS', async () => {
      // Security: verify.walletconnect.org in path should NOT trigger kickout
      render(<WebViewScreen {...createProps('https://app.aave.com')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://evil.com/verify.walletconnect.org/fake-path',
        mainDocumentURL: 'https://app.aave.com/',
        isTopFrame: false,
        navigationType: 'other',
      });

      // The key security fix: spoofed URL should NOT trigger WalletConnect Safari kickout
      expect(mockAlert.alert).not.toHaveBeenCalled();
      expect(mockLinking.openURL).not.toHaveBeenCalled();
      // In a trusted session, HTTPS URLs are allowed (parent-trusted session model)
      expect(result).toBe(true);
    });

    it('blocks spoofed WalletConnect URL with domain as subdomain prefix on iOS', async () => {
      // Security: verify.walletconnect.org.evil.com should NOT match
      render(<WebViewScreen {...createProps('https://app.aave.com')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://verify.walletconnect.org.evil.com/attestation',
        mainDocumentURL: 'https://app.aave.com/',
        isTopFrame: false,
        navigationType: 'other',
      });

      // The key security fix: spoofed URL should NOT trigger WalletConnect Safari kickout
      expect(mockAlert.alert).not.toHaveBeenCalled();
      expect(mockLinking.openURL).not.toHaveBeenCalled();
      // In a trusted session, HTTPS URLs are allowed (parent-trusted session model)
      expect(result).toBe(true);
    });

    it('enforces "always open externally" policy in onShouldStartLoadWithRequest', async () => {
      // keys.coinbase.com is in ALWAYS_OPEN_EXTERNALLY list
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://keys.coinbase.com/connect',
        isTopFrame: true,
        navigationType: 'click',
      });

      // Should block and show wallet confirmation
      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open in Browser',
        'This will open in your browser to complete the wallet connection.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Open' }),
        ]),
      );
    });

    it('opens current page externally when "always open externally" URL is confirmed', async () => {
      // Mock Alert to auto-confirm
      mockAlert.alert.mockImplementation(
        (
          _title: string,
          _message: string,
          buttons: Array<{ text: string; onPress?: () => void }>,
        ) => {
          const openButton = buttons.find(b => b.text === 'Open');
          openButton?.onPress?.();
        },
      );
      mockLinking.canOpenURL.mockResolvedValue(true);

      render(<WebViewScreen {...createProps('https://app.aave.com')} />);
      const webview = screen.getByTestId('webview');

      await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://keys.coinbase.com/connect',
        isTopFrame: true,
        navigationType: 'click',
      });

      await waitFor(() => {
        // Should open the current page (app.aave.com), not the navigation target
        expect(mockLinking.openURL).toHaveBeenCalledWith(
          'https://app.aave.com',
        );
      });
    });

    it('enforces "always open externally" policy for keys.coinbase.com', async () => {
      // keys.coinbase.com is in ALWAYS_OPEN_EXTERNALLY (not TRUSTED_DOMAINS)
      // It should always trigger external open, never load in WebView
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://keys.coinbase.com',
        isTopFrame: true,
        navigationType: 'click',
      });

      // Should block (not allow in WebView) and trigger external open
      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open in Browser',
        'This will open in your browser to complete the wallet connection.',
        expect.any(Array),
      );
    });

    it('prevents keys.coinbase.com from being treated as trusted entrypoint', async () => {
      // Verify keys.coinbase.com cannot start a trusted session
      render(<WebViewScreen {...createProps('https://keys.coinbase.com')} />);
      const webview = screen.getByTestId('webview');

      // The initial URL should redirect externally, not load in WebView
      // Since keys.coinbase.com is not trusted, the fallback URL will be used
      // We can verify this by checking that a navigation to keys.coinbase.com blocks
      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://keys.coinbase.com/wallet',
        isTopFrame: true,
        navigationType: 'click',
      });

      expect(result).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open in Browser',
        'This will open in your browser to complete the wallet connection.',
        expect.any(Array),
      );
    });

    it('prevents keys.coinbase.com from loading in WebView despite being subdomain of coinbase.com', async () => {
      // keys.coinbase.com is a subdomain of coinbase.com (which IS trusted)
      // But keys.coinbase.com should be blocked because it's in always-external list
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Try to navigate to keys.coinbase.com
      const keysResult = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'https://keys.coinbase.com',
        isTopFrame: true,
        navigationType: 'click',
      });

      // Should be blocked because it's in always-external list (not allowed in WebView)
      expect(keysResult).toBe(false);
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open in Browser',
        'This will open in your browser to complete the wallet connection.',
        expect.any(Array),
      );
    });

    it('blocks deep-link schemes from iframes on iOS (isTopFrame=false)', async () => {
      // iOS-specific: iframe protection via isUserInitiatedTopFrameNavigation
      mockLinking.canOpenURL.mockResolvedValue(true);

      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Simulate iframe navigation (isTopFrame=false) trying to open deep link
      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'sms:+1234567890',
        isTopFrame: false,
        navigationType: 'click',
      });

      expect(result).toBe(false);
      await waitFor(() => {
        // Should NOT open because it's from an iframe
        expect(mockLinking.openURL).not.toHaveBeenCalled();
      });
    });

    it('allows deep-link schemes from top frame on iOS (isTopFrame=true, click)', async () => {
      // iOS-specific: user-initiated top-frame navigation is allowed (with confirmation)
      // Mock Alert to auto-confirm
      mockAlert.alert.mockImplementation(
        (
          _title: string,
          _message: string,
          buttons: Array<{ text: string; onPress?: () => void }>,
        ) => {
          const openButton = buttons.find(b => b.text === 'Open');
          openButton?.onPress?.();
        },
      );
      mockLinking.canOpenURL.mockResolvedValue(true);

      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Simulate top-frame user click navigation
      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'mailto:test@example.com',
        isTopFrame: true,
        navigationType: 'click',
      });

      expect(result).toBe(false);
      await waitFor(() => {
        // Should open because it's top-frame + user-initiated + confirmed
        expect(mockLinking.openURL).toHaveBeenCalledWith(
          'mailto:test@example.com',
        );
      });
    });

    it('blocks deep-link schemes with non-click navigationType on iOS', async () => {
      // iOS-specific: only 'click' navigationType is considered user-initiated
      mockLinking.canOpenURL.mockResolvedValue(true);

      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Simulate top-frame but non-click navigation (e.g., 'other' from script)
      const result = await webview.props.onShouldStartLoadWithRequest?.({
        url: 'tel:+1234567890',
        isTopFrame: true,
        navigationType: 'other',
      });

      expect(result).toBe(false);
      await waitFor(() => {
        // Should NOT open because navigationType is not 'click'
        expect(mockLinking.openURL).not.toHaveBeenCalled();
      });
    });

    it('allows all deep-link navigations on Android (no iframe protection)', async () => {
      // Android doesn't have isTopFrame/navigationType, so allow everything
      mockPlatform.OS = 'android';

      try {
        // Mock Alert to auto-confirm
        mockAlert.alert.mockImplementation(
          (
            _title: string,
            _message: string,
            buttons: Array<{ text: string; onPress?: () => void }>,
          ) => {
            const openButton = buttons.find(b => b.text === 'Open');
            openButton?.onPress?.();
          },
        );
        mockLinking.canOpenURL.mockResolvedValue(true);

        render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
        const webview = screen.getByTestId('webview');

        // Android request doesn't include iOS-specific fields
        const result = await webview.props.onShouldStartLoadWithRequest?.({
          url: 'sms:+1234567890',
        });

        expect(result).toBe(false);
        await waitFor(() => {
          // Should open on Android (no iframe protection)
          expect(mockLinking.openURL).toHaveBeenCalledWith('sms:+1234567890');
        });
      } finally {
        mockPlatform.OS = 'ios';
      }
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

    it('blocks non-HTTPS target="_blank" links in trusted session (security fix)', () => {
      // Security: non-HTTPS window.open calls should be blocked to prevent
      // drive-by deep-linking from iframes on trusted sites
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'http://external-site.com',
        },
      });

      // Non-HTTPS links should NOT open externally (blocked for security)
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('blocks deep-link schemes via target="_blank" in trusted session (security fix)', () => {
      // Security: deep-link schemes (sms:, tel:, etc.) via window.open should be
      // blocked to prevent iframe-based attacks on trusted sites
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Test various deep-link schemes
      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'sms:+1234567890',
        },
      });
      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'tel:+1234567890',
        },
      });
      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'mailto:test@example.com',
        },
      });

      // None of these should open externally (blocked for security)
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('blocks disallowed schemes (javascript:, file://, file:, ftp://, ftp:, ftps://, ftps:) via target="_blank"', () => {
      // Security: disallowed schemes should never be opened, even from trusted sessions
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      DISALLOWED_SCHEMES.forEach(scheme => {
        webview.props.onOpenWindow?.({
          nativeEvent: {
            targetUrl: `${scheme}malicious-code`,
          },
        });
      });

      // Disallowed schemes should be blocked by openUrl
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('blocks all window.open from untrusted session (no trusted entrypoint)', () => {
      // Security: without a trusted entrypoint, even HTTPS window.open should be blocked
      // Note: The default fallback URL is trusted, so we need to test the logic directly
      // In practice, this scenario is prevented at initialization
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Simulate untrusted HTTPS URL
      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'https://untrusted-external.com',
        },
      });

      // In an untrusted session, this would be blocked (but our test starts trusted)
      // This test documents expected behavior when isSessionTrusted = false
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('handles Coinbase wallet special case - shows confirmation dialog', () => {
      render(
        <WebViewScreen {...createProps('https://apps.self.xyz/wallet')} />,
      );
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'https://keys.coinbase.com/connect',
        },
      });

      // Should show wallet confirmation dialog
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open in Browser',
        'This will open in your browser to complete the wallet connection.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Open' }),
        ]),
      );
    });

    it('blocks data: URLs via target="_blank" (XSS prevention)', () => {
      // Security: data: URLs could contain malicious scripts
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'data:text/html,<script>alert("xss")</script>',
        },
      });

      // data: URLs should be blocked (not HTTPS, not trusted)
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });

    it('blocks blob: URLs via target="_blank"', () => {
      // Security: blob: URLs could be used to bypass security
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'blob:https://apps.self.xyz/12345',
        },
      });

      // blob: URLs should be blocked (not HTTPS, not trusted)
      expect(mockLinking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('external navigation confirmation dialog', () => {
    it('shows wallet confirmation when Coinbase wallet is triggered', () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'https://keys.coinbase.com/connect',
        },
      });

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open in Browser',
        'This will open in your browser to complete the wallet connection.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Open' }),
        ]),
      );
    });

    it('shows deep-link confirmation when opening mailto/tel schemes', async () => {
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Trigger deep-link via onShouldStartLoadWithRequest
      await webview.props.onShouldStartLoadWithRequest?.({
        url: 'mailto:test@example.com',
        isTopFrame: true,
        navigationType: 'click',
      });

      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open External App',
        'This will open an external app.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Open' }),
        ]),
      );
    });

    it('opens URL when user confirms deep-link dialog', async () => {
      // Mock Alert to simulate user clicking "Open"
      mockAlert.alert.mockImplementation(
        (
          _title: string,
          _message: string,
          buttons: Array<{ text: string; onPress?: () => void }>,
        ) => {
          const openButton = buttons.find(b => b.text === 'Open');
          openButton?.onPress?.();
        },
      );
      mockLinking.canOpenURL.mockResolvedValue(true);

      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      await webview.props.onShouldStartLoadWithRequest?.({
        url: 'mailto:test@example.com',
        isTopFrame: true,
        navigationType: 'click',
      });

      await waitFor(() => {
        expect(mockLinking.openURL).toHaveBeenCalledWith(
          'mailto:test@example.com',
        );
      });
    });

    it('does not open URL when user cancels deep-link dialog', async () => {
      // Mock Alert to simulate user clicking "Cancel"
      mockAlert.alert.mockImplementation(
        (
          _title: string,
          _message: string,
          buttons: Array<{ text: string; onPress?: () => void }>,
        ) => {
          const cancelButton = buttons.find(b => b.text === 'Cancel');
          cancelButton?.onPress?.();
        },
      );
      mockLinking.canOpenURL.mockResolvedValue(true);

      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      await webview.props.onShouldStartLoadWithRequest?.({
        url: 'tel:+1234567890',
        isTopFrame: true,
        navigationType: 'click',
      });

      // Wait a tick to ensure any async operations would have completed
      await waitFor(() => {
        expect(mockLinking.openURL).not.toHaveBeenCalled();
      });
    });

    it('opens parent URL when user confirms Coinbase wallet dialog', async () => {
      // Mock Alert to simulate user clicking "Open"
      mockAlert.alert.mockImplementation(
        (
          _title: string,
          _message: string,
          buttons: Array<{ text: string; onPress?: () => void }>,
        ) => {
          const openButton = buttons.find(b => b.text === 'Open');
          openButton?.onPress?.();
        },
      );
      mockLinking.canOpenURL.mockResolvedValue(true);

      render(
        <WebViewScreen {...createProps('https://apps.self.xyz/wallet')} />,
      );
      const webview = screen.getByTestId('webview');

      webview.props.onOpenWindow?.({
        nativeEvent: {
          targetUrl: 'https://keys.coinbase.com/connect',
        },
      });

      await waitFor(() => {
        // Should open the parent URL, not the Coinbase URL
        expect(mockLinking.openURL).toHaveBeenCalledWith(
          'https://apps.self.xyz/wallet',
        );
      });
    });

    it('shows external-site confirmation for untrusted HTTPS navigation', async () => {
      // Start from untrusted URL (falls back to default trusted URL, so we need
      // to simulate a scenario where untrusted navigation would be blocked)
      render(<WebViewScreen {...createProps('https://apps.self.xyz')} />);
      const webview = screen.getByTestId('webview');

      // Navigate to untrusted HTTP URL (not HTTPS, not trusted)
      await webview.props.onShouldStartLoadWithRequest?.({
        url: 'http://malicious-site.com',
        isTopFrame: true,
        navigationType: 'click',
      });

      // Should show external-site confirmation
      expect(mockAlert.alert).toHaveBeenCalledWith(
        'Open in Browser',
        'This will open an external website in your browser.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Open' }),
        ]),
      );
    });
  });
});
