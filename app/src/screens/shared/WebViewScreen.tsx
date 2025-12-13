// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

/**
 * Trusted entrypoints: these domains are allowed to start a session.
 * Once a session starts from a trusted domain, HTTPS child navigations are
 * allowed without expanding this list (parent-trusted session model).
 * This keeps partners from breaking the WebView when they add dependencies,
 * while still requiring the initial navigation to be curated.
 */
const TRUSTED_DOMAINS = Object.freeze([
  'aave.com', // Aave protocol - DeFi lending network
  'amity-lock-11401309.figma.site', // Degen Tarot game
  'celo.org', // CELO Names - includes names.celo.org
  'cloud.google.com', // Google Cloud - AI agents in the cloud (includes cloud.google.com)
  'karmahq.xyz', // Karma - Launch & fund projects
  'lemonade.social', // Lemonade - Events and communities
  'self.xyz', // Base domain and all subdomains (*.self.xyz) - includes espresso.self.xyz
  'talent.app', // Talent Protocol - Main app
  'talentprotocol.com', // Talent Protocol - Marketing/info site
  'velodrome.finance', // Velodrome - Swap, deposit, take the lead
]) as readonly string[];

/**
 * Check if a URL is from a trusted domain.
 * Matches exact domain or any subdomain of trusted domains.
 */
const isTrustedDomain = (url: string): boolean => {
  try {
    const hostname = new URL(url).hostname;
    return TRUSTED_DOMAINS.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
};

const isAllowedAboutUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower === 'about:blank' || lower === 'about:srcdoc';
};

/**
 * Check if two URLs have the same origin (protocol + host + port)
 * Used for testing - kept for backward compatibility
 */
const isSameOrigin = (url1: string, url2: string): boolean => {
  try {
    return new URL(url1).origin === new URL(url2).origin;
  } catch {
    return false;
  }
};

/**
 * iOS-only mitigation for drive-by deep-linking via iframes.
 * Gates external URL opens to top-frame, user-initiated navigations.
 *
 * On iOS, isTopFrame and navigationType are available on the request object.
 * On Android, these properties are unavailable, so we allow all navigations.
 *
 * This prevents malicious iframes on trusted partner sites from invoking
 * external app opens (sms:, mailto:, etc.) without explicit user interaction.
 */
interface WebViewRequestWithIosProps {
  isTopFrame?: boolean;
  navigationType?:
    | 'click'
    | 'formsubmit'
    | 'formresubmit'
    | 'backforward'
    | 'reload'
    | 'other';
}

const isUserInitiatedTopFrameNavigation = (
  req: WebViewRequestWithIosProps,
): boolean => {
  // Android: these properties are unavailable, allow all navigations
  if (Platform.OS !== 'ios') {
    return true;
  }

  // iOS: block if explicitly from an iframe
  if (req.isTopFrame === false) {
    return false;
  }

  // iOS: only allow 'click' or undefined (backward compatibility) navigations
  // Block 'other', 'reload', 'formsubmit', 'backforward' as non-user-initiated
  const navType = req.navigationType;
  if (navType !== undefined && navType !== 'click') {
    return false;
  }

  return true;
};

// Export for testing
export { DISALLOWED_SCHEMES, TRUSTED_DOMAINS, isSameOrigin, isTrustedDomain };

/**
 * Schemes that are disallowed from being opened externally.
 * Using a blacklist approach - block specific dangerous schemes, allow everything else.
 */
const DISALLOWED_SCHEMES = Object.freeze([
  'ftp://',
  'file://',
  // eslint-disable-next-line no-script-url
  'javascript:',
]) as readonly string[];

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

              // Open non-http(s) schemes externally (mailto, tel, etc.)
              // iOS: only allow top-frame, user-initiated navigations to prevent
              // drive-by deep-linking via iframes on trusted partner sites
              if (!/^https?:\/\//i.test(req.url)) {
                if (isUserInitiatedTopFrameNavigation(req)) {
                  openUrl(req.url);
                }
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
                openUrl(req.url);
              }
              return false;
            }}
            onOpenWindow={syntheticEvent => {
              // Handle links that try to open in new window (target="_blank")
              const { nativeEvent } = syntheticEvent;
              const targetUrl = nativeEvent.targetUrl;

              if (targetUrl) {
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

                // For window.open calls to non-trusted targets, open externally
                openUrl(targetUrl);
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
              if (isTrustedDomain(event.url)) {
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
