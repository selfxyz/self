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

const defaultUrl = 'https://self.xyz';

export const WebViewScreen: React.FC<WebViewScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const params = route?.params as WebViewScreenParams | undefined;
  const safeParams: WebViewScreenParams = params ?? { url: defaultUrl };
  const { url, title } = safeParams;
  const isHttpUrl = useCallback((value?: string) => {
    return typeof value === 'string' && /^https?:\/\//i.test(value);
  }, []);
  const initialUrl = useMemo(
    () => (isHttpUrl(url) ? url : defaultUrl),
    [isHttpUrl, url],
  );
  const webViewRef = useRef<WebViewType>(null);
  const [canGoBackInWebView, setCanGoBackInWebView] = useState(false);
  const [canGoForwardInWebView, setCanGoForwardInWebView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState<string | undefined>(title);

  const derivedTitle = pageTitle || title || currentUrl;

  const openUrl = useCallback(async (targetUrl: string) => {
    // Allow only safe external schemes
    if (!/^(https?|mailto|tel):/i.test(targetUrl)) {
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
              // Open non-http(s) externally, block in WebView
              if (!/^https?:\/\//i.test(req.url)) {
                openUrl(req.url);
                return false;
              }
              return true;
            }}
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
        borderTopLeftRadius={30}
        borderTopRightRadius={30}
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
