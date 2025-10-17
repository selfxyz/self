// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, StyleSheet, View } from 'react-native';
import WebView, { type WebView as WebViewType } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

import { charcoal, slate200, white } from '../../constants/colors';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { WebViewFooter } from './WebViewFooter';
import { WebViewNavBar } from './WebViewNavBar';

export interface WebViewScreenParams {
  url: string;
  title?: string;
}

export interface WebViewScreenProps extends WebViewScreenParams {
  canGoBack?: boolean;
  onBackPress: () => void;
  safeAreaTop?: number;
  safeAreaBottom?: number;
}

const defaultUrl = 'https://self.xyz';

export const WebViewScreen: React.FC<WebViewScreenProps> = ({
  url,
  title,
  canGoBack: stackCanGoBack = false,
  onBackPress,
  safeAreaTop = 0,
  safeAreaBottom = 0,
}) => {
  const webViewRef = useRef<WebViewType>(null);
  const [canGoBackInWebView, setCanGoBackInWebView] = useState(false);
  const [canGoForwardInWebView, setCanGoForwardInWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(url || defaultUrl);
  const [pageTitle, setPageTitle] = useState<string | undefined>(title);

  const derivedTitle = pageTitle || title || currentUrl;

  const openUrl = useCallback(async (targetUrl: string) => {
    try {
      const supported = await Linking.canOpenURL(targetUrl);
      if (supported) {
        await Linking.openURL(targetUrl);
      }
    } catch (error) {
      console.error('Failed to open URL externally', error);
    }
  }, []);

  const handleOpenExternal = useCallback(async () => {
    await openUrl(currentUrl);
  }, [currentUrl, openUrl]);

  const handleReload = useCallback(() => {
    setIsLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleGoBack = useCallback(() => {
    if (canGoBackInWebView) {
      webViewRef.current?.goBack();
      return;
    }
    onBackPress();
  }, [canGoBackInWebView, onBackPress]);

  const handleGoForward = useCallback(() => {
    if (canGoForwardInWebView) {
      webViewRef.current?.goForward();
    }
  }, [canGoForwardInWebView]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBackInWebView) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [canGoBackInWebView]);

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
          canGoBack={stackCanGoBack}
          onBackPress={handleGoBack}
          onOpenExternalPress={handleOpenExternal}
          safeAreaTop={safeAreaTop}
        />
        <View style={styles.webViewContainer}>
          {isLoading && (
            <View pointerEvents="none" style={styles.loadingOverlay}>
              <ActivityIndicator size="small" color={charcoal} />
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: url || defaultUrl }}
            onNavigationStateChange={(event: WebViewNavigation) => {
              setCanGoBackInWebView(event.canGoBack);
              setCanGoForwardInWebView(event.canGoForward);
              setCurrentUrl(event.url);
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
        borderTopLeftRadius={30}
        borderTopRightRadius={30}
        borderTopWidth={1}
        borderColor={slate200}
        style={{ paddingTop: 0 }}
        safeAreaBottom={safeAreaBottom}
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
