// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useMemo } from 'react';
import { Alert, View } from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  type AnalyticsSink,
  type DocumentsStore,
  type LoadDiagnosticEvent,
  type LoadErrorInfo,
  type NavigationCallbacks,
  type SelfSdkError,
  SelfVerification,
  type VerificationRequest,
  type VerificationResult,
} from '@selfxyz/rn-sdk';

import {
  captureWebViewLoadDiagnostic,
  clearReferenceTag,
  setReferenceTag,
} from '@/config/sentry';
import type { RootStackParamList } from '@/navigation';
import { selfClientDocumentsAdapter } from '@/providers/passportDataProvider';
import {
  WebViewErrorOverlay,
  WebViewLoadingOverlay,
} from '@/screens/dev/WebViewHostOverlays';
import { trackEvent, trackNfcEvent } from '@/services/analytics';

const WEBVIEW_DEV_URL_ENV = process.env.WEBVIEW_DEV_URL;

const WebViewHostScreen: React.FC = () => {
  const navigation =
    useNavigation() as NativeStackScreenProps<RootStackParamList>['navigation'];
  const route = useRoute<RouteProp<RootStackParamList, 'WebViewHost'>>();
  const request = useMemo<VerificationRequest>(
    () => (route.params?.request ?? {}) as VerificationRequest,
    [route.params?.request],
  );

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

  const documents = useMemo<DocumentsStore>(
    () => ({
      loadCatalog: () => selfClientDocumentsAdapter.loadDocumentCatalog(),
      saveCatalog: catalog =>
        selfClientDocumentsAdapter.saveDocumentCatalog(catalog as never),
      loadById: id => selfClientDocumentsAdapter.loadDocumentById(id),
      save: (id, data) =>
        selfClientDocumentsAdapter.saveDocument(id, data as never),
      delete: id => selfClientDocumentsAdapter.deleteDocument(id),
    }),
    [],
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

  const handleLoadDiagnostic = useCallback((event: LoadDiagnosticEvent) => {
    captureWebViewLoadDiagnostic(event.kind, event.source, event.detail);
  }, []);

  const renderLoading = useCallback(
    (stage: 'loading' | 'slow') => <WebViewLoadingOverlay stage={stage} />,
    [],
  );

  const renderError = useCallback(
    (info: LoadErrorInfo) => <WebViewErrorOverlay info={info} />,
    [],
  );

  const handleReferenceId = useCallback(
    (referenceId: string) => {
      setReferenceTag(referenceId, request.verificationId);
    },
    [request.verificationId],
  );
  useEffect(() => () => clearReferenceTag(), []);

  return (
    <View
      testID="webview-host-root"
      style={{ flex: 1, backgroundColor: '#000' }}
    >
      <SelfVerification
        request={request}
        mode="self-app"
        onSuccess={handleSuccess}
        onFailure={handleFailure}
        onCancelled={handleCancelled}
        onReferenceId={handleReferenceId}
        debug={__DEV__}
        devServerUrl={__DEV__ ? WEBVIEW_DEV_URL_ENV : undefined}
        analytics={analytics}
        navigation={navigationCallbacks}
        documents={documents}
        onLoadDiagnostic={handleLoadDiagnostic}
        renderLoading={renderLoading}
        renderError={renderError}
      />
    </View>
  );
};

export default WebViewHostScreen;
