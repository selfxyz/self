// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, {
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import {
  View,
  Platform,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  type ViewStyle,
} from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

import { MessageRouter } from './bridge/MessageRouter';
import { createHandlers } from './handlers';
import type { AnalyticsSink } from './handlers/AnalyticsHandler';
import type { NavigationCallbacks } from './handlers/NavigationHandler';
import type { DocumentsStore } from './handlers/DocumentsHandler';
import type { SelfCryptoModule } from './handlers/CryptoHandler';

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
  /**
   * When set (and __DEV__ is true), load this URL instead of the bundled
   * asset. Release builds compile the dev path out entirely so this is
   * ignored even if a malicious caller passes it in production.
   */
  devServerUrl?: string;
  /**
   * Bridge handler injection points. Each is optional; omitting leaves the
   * handler with default behavior (analytics is silent, navigation reports
   * not-handled, documents uses an in-memory store, crypto requires the
   * native SelfCrypto module).
   */
  analytics?: AnalyticsSink;
  navigation?: NavigationCallbacks;
  documents?: DocumentsStore;
  crypto?: SelfCryptoModule;
  /**
   * Time in ms before the loading splash transitions to a "still loading"
   * state with a manual retry. Defaults to 3000ms.
   */
  spinnerTimeoutMs?: number;
  /**
   * Time in ms before the loading splash treats the WebView as failed to
   * load and surfaces a recoverable error. Defaults to 10000ms.
   */
  loadTimeoutMs?: number;
  style?: ViewStyle;
}

type LoadStage = 'loading' | 'slow' | 'failed' | 'ready';

const DEFAULT_SPINNER_TIMEOUT_MS = 3000;
const DEFAULT_LOAD_TIMEOUT_MS = 10_000;

export const SelfVerification: React.FC<SelfVerificationProps> = ({
  request,
  onSuccess,
  onFailure,
  onCancelled,
  debug = false,
  devServerUrl,
  analytics,
  navigation,
  documents,
  crypto,
  spinnerTimeoutMs = DEFAULT_SPINNER_TIMEOUT_MS,
  loadTimeoutMs = DEFAULT_LOAD_TIMEOUT_MS,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [loadStage, setLoadStage] = useState<LoadStage>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  // Track WebView readiness via the lifecycle.ready bridge message.
  const handleReady = useCallback(() => {
    setLoadStage('ready');
  }, []);

  // We extend onGoBack so React Native's BackHandler can route through it.
  const navigationWithBack = useMemo<NavigationCallbacks>(() => {
    return {
      onGoBack: navigation?.onGoBack,
      onGoTo: navigation?.onGoTo,
    };
  }, [navigation]);

  const router = useMemo(
    () =>
      new MessageRouter({
        sendToWebView: (js: string) => {
          webViewRef.current?.injectJavaScript(js);
        },
        debug,
      }),
    [debug],
  );

  // Wrap lifecycle ready so the loading splash dismisses.
  const wrappedOnSuccess = useCallback(
    (result: VerificationResult) => {
      onSuccess(result);
    },
    [onSuccess],
  );

  useEffect(() => {
    const handlers = createHandlers({
      request,
      onSuccess: wrappedOnSuccess,
      onFailure,
      onCancelled,
      debug,
      router,
      analytics,
      navigation: navigationWithBack,
      documents,
      crypto,
    });
    // Wrap the lifecycle ready handler to mark the splash dismissed.
    const lifecycle = handlers.find(h => h.domain === 'lifecycle');
    if (lifecycle) {
      const originalHandle = lifecycle.handle.bind(lifecycle);
      lifecycle.handle = async (method, params) => {
        if (method === 'ready') {
          handleReady();
        }
        return originalHandle(method, params);
      };
    }
    handlers.forEach(h => router.register(h));
  }, [
    request,
    wrappedOnSuccess,
    onFailure,
    onCancelled,
    debug,
    router,
    analytics,
    navigationWithBack,
    documents,
    crypto,
    handleReady,
  ]);

  // Hardware-back routing on Android: ask the WebView first via the bridge;
  // if the WebView's navigation handler claims it (returns handled=true), we
  // do nothing here. If not, the BackHandler falls through to the host
  // navigator's default behavior.
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.pushEvent('navigation', 'back', {});
      // Always claim the back press — the WebView decides what to do.
      return true;
    });
    return () => sub.remove();
  }, [router]);

  // Loading state machine: spinner → slow → failed.
  useEffect(() => {
    if (loadStage === 'ready') return undefined;
    const slowTimer = setTimeout(() => {
      setLoadStage(stage => (stage === 'loading' ? 'slow' : stage));
    }, spinnerTimeoutMs);
    const failTimer = setTimeout(() => {
      setLoadStage(stage => (stage === 'ready' ? stage : 'failed'));
    }, loadTimeoutMs);
    return () => {
      clearTimeout(slowTimer);
      clearTimeout(failTimer);
    };
  }, [loadStage, reloadKey, spinnerTimeoutMs, loadTimeoutMs]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      router.onMessageReceived(event.nativeEvent.data);
    },
    [router],
  );

  const source = useMemo(() => {
    if (__DEV__ && devServerUrl) {
      return { uri: devServerUrl };
    }
    return Platform.select({
      android: { uri: 'file:///android_asset/self-wallet/index.html' },
      ios: {
        uri: mainBundlePath
          ? `${mainBundlePath}/self-wallet/index.html`
          : 'self-wallet/index.html',
      },
    });
  }, [devServerUrl]);

  const retry = useCallback(() => {
    setLoadStage('loading');
    setReloadKey(k => k + 1);
    webViewRef.current?.reload();
  }, []);

  return (
    <View style={[{ flex: 1, backgroundColor: '#000' }, style]}>
      <WebView
        key={reloadKey}
        ref={webViewRef}
        source={source!}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        style={{ flex: 1, opacity: loadStage === 'ready' ? 1 : 0 }}
      />
      {loadStage !== 'ready' ? (
        <LoadingOverlay stage={loadStage} onRetry={retry} />
      ) : null}
    </View>
  );
};

interface LoadingOverlayProps {
  stage: 'loading' | 'slow' | 'failed';
  onRetry: () => void;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ stage, onRetry }) => {
  const showRetry = stage !== 'loading';
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="large" color="#fff" />
      {stage === 'slow' ? (
        <Text style={{ color: '#fff', marginTop: 16 }}>Still loading…</Text>
      ) : null}
      {stage === 'failed' ? (
        <Text style={{ color: '#fff', marginTop: 16 }}>Couldn't load Self.</Text>
      ) : null}
      {showRetry ? (
        <TouchableOpacity
          onPress={onRetry}
          accessibilityRole="button"
          style={{
            marginTop: 24,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderColor: '#fff',
            borderWidth: 1,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff' }}>Retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};
