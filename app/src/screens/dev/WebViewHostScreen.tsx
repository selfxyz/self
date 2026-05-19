// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useMemo } from 'react';
import { Alert, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  type AnalyticsSink,
  type NavigationCallbacks,
  type SelfSdkError,
  SelfVerification,
  type VerificationResult,
} from '@selfxyz/rn-sdk';

import type { RootStackParamList } from '@/navigation';
import { trackEvent, trackNfcEvent } from '@/services/analytics';

const WEBVIEW_DEV_URL_ENV = process.env.WEBVIEW_DEV_URL;

const WebViewHostScreen: React.FC = () => {
  const navigation =
    useNavigation() as NativeStackScreenProps<RootStackParamList>['navigation'];

  const analytics = useMemo<AnalyticsSink>(
    () => ({
      trackEvent: (name, properties) => trackEvent(name, properties),
      trackNfcEvent: (name, properties) => trackNfcEvent(name, properties),
    }),
    [],
  );

  const navigationCallbacks = useMemo<NavigationCallbacks>(
    () => ({
      onGoBack: () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        return false;
      },
    }),
    [navigation],
  );

  const handleSuccess = useCallback(
    (result: VerificationResult) => {
      Alert.alert(
        'WebView host',
        `Verification finished: ${JSON.stringify(result)}`,
        [{ text: 'Close', onPress: () => navigation.goBack() }],
      );
    },
    [navigation],
  );

  const handleFailure = useCallback(
    (error: SelfSdkError) => {
      Alert.alert('WebView host', `Failure: ${error.code} — ${error.message}`, [
        { text: 'Close', onPress: () => navigation.goBack() },
      ]);
    },
    [navigation],
  );

  const handleCancelled = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <SelfVerification
        request={{}}
        onSuccess={handleSuccess}
        onFailure={handleFailure}
        onCancelled={handleCancelled}
        debug={__DEV__}
        devServerUrl={__DEV__ ? WEBVIEW_DEV_URL_ENV : undefined}
        analytics={analytics}
        navigation={navigationCallbacks}
      />
    </View>
  );
};

export default WebViewHostScreen;
