// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
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
 * Trusted domains that are allowed to load in the WebView.
 * This list is controlled by the app - not by URL parameters that attackers could manipulate.
 *
 * IMPORTANT: Keep this list in sync with the apps listed on apps.self.xyz.
 * When a domain is trusted, it opens in the internal WebView; otherwise it opens in external wallet.
 *
 * TODO: Migrate external URLs (like Figma) to self.xyz subdomains for cleaner security model
 */
const TRUSTED_DOMAINS = [
  'aave.com', // Aave protocol - DeFi lending network
  'amity-lock-11401309.figma.site', // Degen Tarot game
  'celo.org', // CELO Names - includes names.celo.org
  'google.com', // Google Cloud - AI agents in the cloud (includes cloud.google.com)
  'karmahq.xyz', // Karma - Launch & fund projects
  'lemonade.social', // Lemonade - Events and communities
  'self.xyz', // Base domain and all subdomains (*.self.xyz) - includes espresso.self.xyz
  'talent.app', // Talent Protocol - Main app
  'talentprotocol.com', // Talent Protocol - Marketing/info site
  'velodrome.finance', // Velodrome - Swap, deposit, take the lead
];

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

// Export for testing
export { TRUSTED_DOMAINS, isSameOrigin, isTrustedDomain };

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

  const derivedTitle = pageTitle || title || currentUrl;

  const openUrl = useCallback(async (targetUrl: string) => {
    // Allow any valid URI scheme (http, https, mailto, tel, wc://, metamask://, etc.)
    // Linking.canOpenURL will validate if the scheme can actually be opened
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(targetUrl)) {
      console.warn('Invalid URL scheme:', targetUrl);
      return;
    }
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
          if (canGoBackInWebView) {
            webViewRef.current?.goBack();
            return true;
          }
          return false;
        },
      );

      return () => subscription.remove();
    }, [canGoBackInWebView]),
  );

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection
        backgroundColor={white}
        alignItems="stretch"
        justifyContent="flex-start"
        padding={0}
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
              // Open non-http(s) schemes externally (mailto, tel, etc.)
              if (!/^https?:\/\//i.test(req.url)) {
                openUrl(req.url);
                return false;
              }

              // Security: Allow navigation to trusted domains only
              // This whitelist is controlled by the app, not URL parameters
              if (isTrustedDomain(req.url)) {
                return true;
              }

              // Untrusted navigation: open externally for safety
              openUrl(req.url);
              return false;
            }}
            onOpenWindow={syntheticEvent => {
              // Handle links that try to open in new window (target="_blank")
              const { nativeEvent } = syntheticEvent;
              const targetUrl = nativeEvent.targetUrl;

              if (targetUrl) {
                // Allow trusted domains to load in the current WebView
                if (isTrustedDomain(targetUrl)) {
                  webViewRef.current?.injectJavaScript(
                    `window.location.href = ${JSON.stringify(targetUrl)};`,
                  );
                } else {
                  // Open untrusted domains externally for security
                  openUrl(targetUrl);
                }
              }
            }}
            setSupportMultipleWindows={false}
            source={{ uri: initialUrl }}
            onNavigationStateChange={(event: WebViewNavigation) => {
              setCanGoBackInWebView(event.canGoBack);
              setCanGoForwardInWebView(event.canGoForward);
              setCurrentUrl(prev => (isHttpUrl(event.url) ? event.url : prev));
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
