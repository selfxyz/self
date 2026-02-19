// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useRef, useCallback, useMemo } from 'react';
import { View, Platform, type ViewStyle } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import { MessageRouter } from './bridge/MessageRouter';
import { createHandlers } from './handlers';

// Resolve iOS main bundle path via react-native-fs (optional peerDep).
// Falls back to a relative path when RNFS is not installed.
let mainBundlePath: string | undefined;
try {
  const RNFS = require('react-native-fs');
  mainBundlePath = RNFS.MainBundlePath;
} catch {
  // react-native-fs not installed — iOS will use relative path
}

export interface VerificationRequest {
  userId?: string;
  scope?: string;
  disclosures?: string[];
}

export interface VerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  claims?: Record<string, unknown>;
}

export interface SelfSdkError {
  code: string;
  message: string;
}

export interface SelfVerificationProps {
  request: VerificationRequest;
  onSuccess: (result: VerificationResult) => void;
  onFailure: (error: SelfSdkError) => void;
  onCancelled: () => void;
  debug?: boolean;
  devServerUrl?: string;
  style?: ViewStyle;
}

export const SelfVerification: React.FC<SelfVerificationProps> = ({
  request,
  onSuccess,
  onFailure,
  onCancelled,
  debug = false,
  devServerUrl,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);

  const router = useMemo(
    () =>
      new MessageRouter({
        sendToWebView: (js: string) => {
          webViewRef.current?.injectJavaScript(js);
        },
        debug,
      }),
    [],
  );

  useMemo(() => {
    const handlers = createHandlers({
      request,
      onSuccess,
      onFailure,
      onCancelled,
      debug,
      router,
    });
    handlers.forEach(h => router.register(h));
  }, [request, onSuccess, onFailure, onCancelled, debug, router]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      router.onMessageReceived(event.nativeEvent.data);
    },
    [router],
  );

  const source = devServerUrl
    ? { uri: devServerUrl }
    : Platform.select({
        android: { uri: 'file:///android_asset/self-wallet/index.html' },
        // iOS: Host app must add assets/self-wallet/ to the Xcode "Copy Bundle Resources" build phase.
        // When react-native-fs is installed we resolve an absolute path via MainBundlePath;
        // otherwise we fall back to a relative path that UIWebView resolves against the bundle root.
        ios: {
          uri: mainBundlePath
            ? `${mainBundlePath}/self-wallet/index.html`
            : 'self-wallet/index.html',
        },
      });

  return (
    <View style={[{ flex: 1 }, style]}>
      <WebView
        ref={webViewRef}
        source={source!}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        style={{ flex: 1 }}
      />
    </View>
  );
};
