// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

declare module 'react-native-webview' {
  import type { Component } from 'react';
  import type { ViewStyle } from 'react-native';

  export interface WebViewNavigation {
    url: string;
    title: string;
    loading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
  }

  export interface WebViewProps {
    source: { uri: string };
    onNavigationStateChange?: (event: WebViewNavigation) => void;
    onLoadStart?: () => void;
    onLoadEnd?: () => void;
    startInLoadingState?: boolean;
    style?: ViewStyle;
  }

  class WebView extends Component<WebViewProps> {
    goBack(): void;
    goForward(): void;
    reload(): void;
  }

  export default WebView;
  export type { WebView };
}

declare module 'react-native-webview/lib/WebViewTypes' {
  export interface WebViewNavigation {
    url: string;
    title: string;
    loading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
  }
}
