// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Linking } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

import { WebViewScreen } from '@/screens/shared/WebViewScreen';

jest.mock('react-native-webview', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const MockWebView = ReactModule.forwardRef((props: any, _ref) => {
    return ReactModule.createElement(View, { testID: 'webview', ...props });
  });
  MockWebView.displayName = 'MockWebView';
  return {
    __esModule: true,
    default: MockWebView,
    WebView: MockWebView,
  };
});

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
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
    (console.error as jest.Mock).mockRestore?.();
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
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true as any);
    const openSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as any);
    render(<WebViewScreen {...createProps('https://self.xyz')} />);
    const webview = screen.getByTestId('webview');

    const resultMailto = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'mailto:test@example.com',
    });
    expect(resultMailto).toBe(false);
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith('mailto:test@example.com'),
    );

    const resultTel = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'tel:+123456789',
    });
    expect(resultTel).toBe(false);
    await waitFor(() => expect(openSpy).toHaveBeenCalledWith('tel:+123456789'));
  });

  it('blocks disallowed external schemes and does not attempt to open', async () => {
    const canOpenSpy = jest.spyOn(Linking, 'canOpenURL');
    const openSpy = jest.spyOn(Linking, 'openURL');
    render(<WebViewScreen {...createProps('https://self.xyz')} />);
    const webview = screen.getByTestId('webview');

    const result = await webview.props.onShouldStartLoadWithRequest?.({
      url: 'ftp://example.com',
    });
    expect(result).toBe(false);
    expect(canOpenSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('scrubs error log wording when external open fails', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true as any);
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('boom'));
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
