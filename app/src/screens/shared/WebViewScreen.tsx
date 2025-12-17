// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import WebView, { type WebView as WebViewType } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  charcoal,
  slate200,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { WebViewNavBar } from '@/components/navbar/WebViewNavBar';
import { WebViewFooter } from '@/components/WebViewFooter';
import { selfUrl } from '@/consts/links';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { SharedRoutesParamList } from '@/navigation/types';
import {
  DISALLOWED_SCHEMES,
  isAllowedAboutUrl,
  isHostnameMatch,
  isTrustedDomain,
  isUserInitiatedTopFrameNavigation,
  shouldAlwaysOpenExternally,
} from '@/utils/webview';

export interface WebViewScreenParams {
  url: string;
  title?: string;
  shareTitle?: string;
  shareMessage?: string;
  shareUrl?: string;
}

type WebViewScreenProps = NativeStackScreenProps<
  SharedRoutesParamList,
  'WebView'
>;

const defaultUrl = selfUrl;
const fallbackUrl = 'https://apps.self.xyz';

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: white,
  },
  webView: {
    flex: 1,
    backgroundColor: white,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});

export const WebViewScreen: React.FC<WebViewScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const params = route?.params as WebViewScreenParams | undefined;
  const safeParams: WebViewScreenParams = params ?? { url: defaultUrl };
  const { url, title } = safeParams;
  const isHttpUrl = useCallback((value?: string) => {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
  }, []);
  const initialUrl = useMemo(() => {
    if (isHttpUrl(url) && isTrustedDomain(url)) {
      return url;
    }
    if (isHttpUrl(defaultUrl) && isTrustedDomain(defaultUrl)) {
      return defaultUrl;
    }
    return fallbackUrl;
  }, [isHttpUrl, url]);
  const webViewRef = useRef<WebViewType>(null);
  const [canGoBackInWebView, setCanGoBackInWebView] = useState(false);
  const [canGoForwardInWebView, setCanGoForwardInWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState<string | undefined>(title);
  const [isSessionTrusted, setIsSessionTrusted] = useState(
    isTrustedDomain(initialUrl),
  );

  const derivedTitle = pageTitle || title || currentUrl;

  /**
   * Show a confirmation dialog before opening a URL externally.
   * Returns true if user confirms, false if they cancel.
   */
  const confirmExternalNavigation = useCallback(
    (context: 'wallet' | 'deep-link' | 'external-site'): Promise<boolean> => {
      return new Promise(resolve => {
        const messages: Record<
          typeof context,
          { title: string; body: string }
        > = {
          wallet: {
            title: 'Open in Browser',
            body: 'This will open in your browser to complete the wallet connection.',
          },
          'deep-link': {
            title: 'Open External App',
            body: 'This will open an external app.',
          },
          'external-site': {
            title: 'Open in Browser',
            body: 'This will open an external website in your browser.',
          },
        };

        const { title: alertTitle, body } = messages[context];

        Alert.alert(alertTitle, body, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Open', onPress: () => resolve(true) },
        ]);
      });
    },
    [],
  );

  const openUrl = useCallback(async (targetUrl: string) => {
    // Block disallowed schemes (blacklist approach)
    // Allow everything else - more practical than maintaining a whitelist
    const isDisallowed = DISALLOWED_SCHEMES.some(scheme =>
      targetUrl.toLowerCase().startsWith(scheme.toLowerCase()),
    );
    if (isDisallowed) {
      // Block disallowed schemes - don't attempt to open
      return;
    }
    // Block about:blank and similar about: URLs - they're not meant to be opened externally
    if (targetUrl.toLowerCase().startsWith('about:')) {
      // Silently ignore about: URLs - they're internal browser navigation
      return;
    }
    // Validate URL has a valid scheme pattern
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(targetUrl)) {
      return;
    }
    // Attempt to open the URL
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      }
    } catch (error) {
      console.error(
        'Failed to open externally',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }, []);

  const handleOpenExternal = useCallback(async () => {
    await openUrl(currentUrl);
  }, [currentUrl, openUrl]);

  const handleReload = useCallback(() => {
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleClose = useCallback(() => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    if (canGoBackInWebView) {
      webViewRef.current?.goBack();
      return;
    }
    handleClose();
  }, [canGoBackInWebView, handleClose]);

  const handleGoForward = useCallback(() => {
    if (canGoForwardInWebView) {
      webViewRef.current?.goForward();
    }
  }, [canGoForwardInWebView]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          // First try to go back in WebView if possible
          if (canGoBackInWebView) {
            webViewRef.current?.goBack();
            return true;
          }
          // If WebView can't go back, close the WebView screen (go back in navigation)
          if (navigation?.canGoBack()) {
            navigation.goBack();
            return true;
          }
          // Only allow default behavior (close app) if navigation can't go back
          return false;
        },
      );

      return () => subscription.remove();
    }, [canGoBackInWebView, navigation]),
  );

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection
        backgroundColor={white}
        alignItems="stretch"
        justifyContent="flex-start"
        padding={0}
        paddingHorizontal={5}
      >
        <WebViewNavBar
          title={derivedTitle}
          onBackPress={handleClose}
          onOpenExternalPress={handleOpenExternal}
        />
        <View style={styles.webViewContainer}>
          {isLoading && (
            <View pointerEvents="none" style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={charcoal} />
            </View>
          )}
          <WebView
            ref={webViewRef}
            onShouldStartLoadWithRequest={req => {
              const isHttps = /^https:\/\//i.test(req.url);

              // Allow about:blank/srcdoc during trusted sessions (some wallets use this before redirecting)
              if (isSessionTrusted && isAllowedAboutUrl(req.url)) {
                return true;
              }

              // iOS-specific: Detect WalletConnect attestation from Aave and kick to Safari
              // WalletConnect doesn't work properly in WKWebView for Coinbase Wallet connections
              // Use hostname matching to prevent spoofing (e.g., evil.com/?next=verify.walletconnect.org)
              if (
                Platform.OS === 'ios' &&
                isHostnameMatch(req.url, 'verify.walletconnect.org') &&
                req.mainDocumentURL &&
                isHostnameMatch(req.mainDocumentURL, 'app.aave.com')
              ) {
                // Kick parent page to Safari for wallet connection
                confirmExternalNavigation('wallet').then(confirmed => {
                  if (confirmed) {
                    openUrl(currentUrl);
                  }
                });
                return false;
              }

              // Open non-http(s) schemes externally (mailto, tel, etc.)
              // iOS: only allow top-frame, user-initiated navigations to prevent
              // drive-by deep-linking via iframes on trusted partner sites
              if (!/^https?:\/\//i.test(req.url)) {
                if (isUserInitiatedTopFrameNavigation(req)) {
                  // Show confirmation before opening deep-link schemes
                  confirmExternalNavigation('deep-link').then(confirmed => {
                    if (confirmed) {
                      openUrl(req.url);
                    }
                  });
                }
                return false;
              }

              // Enforce "always open externally" policy before any other checks
              // (e.g., keys.coinbase.com requires window.opener in full browser)
              if (shouldAlwaysOpenExternally(req.url)) {
                // Show confirmation before redirecting to external wallet
                confirmExternalNavigation('wallet').then(confirmed => {
                  if (confirmed) {
                    // Open the current page externally to maintain window.opener
                    openUrl(currentUrl);
                  }
                });
                return false;
              }

              const trusted = isTrustedDomain(req.url);

              // Allow trusted entrypoints and mark session trusted
              if (trusted) {
                if (!isSessionTrusted) {
                  setIsSessionTrusted(true);
                }
                return true;
              }

              // Parent-trusted session model: allow HTTPS child navigations
              // after a trusted entrypoint to avoid breaking on partner deps.
              if (isSessionTrusted && isHttps) {
                return true;
              }

              // Untrusted navigation without a trusted session: open externally
              // iOS: only allow top-frame, user-initiated navigations
              if (isUserInitiatedTopFrameNavigation(req)) {
                // Show confirmation before opening untrusted external site
                confirmExternalNavigation('external-site').then(confirmed => {
                  if (confirmed) {
                    openUrl(req.url);
                  }
                });
              }
              return false;
            }}
            onOpenWindow={syntheticEvent => {
              // Handle links that try to open in new window (target="_blank")
              const { nativeEvent } = syntheticEvent;
              const targetUrl = nativeEvent.targetUrl;

              if (targetUrl) {
                // Coinbase wallet uses window.opener.postMessage from the popup back to
                // the parent page. If we only open the popup externally and keep the
                // parent inside the WebView, the popup cannot find window.opener and the
                // SDK times out. Redirect the parent page (currentUrl) to a real browser
                // context; if we somehow don't know the parent URL, fall back to opening
                // the popup target directly.
                if (shouldAlwaysOpenExternally(targetUrl)) {
                  // Show confirmation before redirecting to external wallet
                  confirmExternalNavigation('wallet').then(confirmed => {
                    if (confirmed) {
                      openUrl(currentUrl || targetUrl);
                    }
                  });
                  return;
                }

                // Some sites open about:blank/srcdoc before redirecting; allow silently
                if (isSessionTrusted && isAllowedAboutUrl(targetUrl)) {
                  return;
                }

                // Allow trusted domains to load in the current WebView
                const trusted = isTrustedDomain(targetUrl);
                if (trusted) {
                  if (!isSessionTrusted) {
                    setIsSessionTrusted(true);
                  }
                  webViewRef.current?.injectJavaScript(
                    `window.location.href = ${JSON.stringify(targetUrl)};`,
                  );
                  return;
                }

                // Parent-trusted session model: allow HTTPS child navigations via window.open
                // after a trusted entrypoint to avoid breaking on partner deps.
                if (isSessionTrusted && /^https:\/\//i.test(targetUrl)) {
                  webViewRef.current?.injectJavaScript(
                    `window.location.href = ${JSON.stringify(targetUrl)};`,
                  );
                  return;
                }

                // Security: Block non-HTTPS/non-trusted window.open calls to prevent
                // drive-by deep-linking from iframes on trusted sites. Unlike
                // onShouldStartLoadWithRequest, onOpenWindow doesn't expose frame-origin
                // metadata, so we cannot verify if this is user-initiated top-frame
                // navigation. Block silently to maintain security without breaking UX.
              }
            }}
            // Enable multiple windows to let WKWebView forward window.open;
            // we still force navigation into the same WebView via onOpenWindow.
            setSupportMultipleWindows
            source={{ uri: initialUrl }}
            onNavigationStateChange={(event: WebViewNavigation) => {
              setCanGoBackInWebView(event.canGoBack);
              setCanGoForwardInWebView(event.canGoForward);
              setCurrentUrl(prev => (isHttpUrl(event.url) ? event.url : prev));
              // Only mark session as trusted if the domain is trusted AND not in always-external list
              // (e.g., keys.coinbase.com should never establish a trusted session)
              if (
                isTrustedDomain(event.url) &&
                !shouldAlwaysOpenExternally(event.url)
              ) {
                setIsSessionTrusted(true);
              }
              if (!title && event.title) {
                setPageTitle(event.title);
              }
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            startInLoadingState
            style={styles.webView}
          />
        </View>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        backgroundColor={white}
        borderTopLeftRadius={20}
        borderTopRightRadius={20}
        borderTopWidth={1}
        borderColor={slate200}
        style={{ paddingTop: 0 }}
      >
        <WebViewFooter
          canGoBack={canGoBackInWebView}
          canGoForward={canGoForwardInWebView}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onReload={handleReload}
          onOpenInBrowser={handleOpenExternal}
        />
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};
