// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Text, View } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  GOOGLE_USAT_FAUCET_POLICY,
  hasEligibleAlternativeDocumentForPolicy,
  isDocumentValidForProving,
  pickBestDocumentToSelect,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { black } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { proofRequestColors } from '@/components/proof-request';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import { useVerificationGateStore } from '@/stores/verificationGateStore';
import { getDocumentTypeName } from '@/utils/documentUtils';
import {
  evaluateGoogleUsatGate,
  evaluateGoogleUsatGateForDocument,
} from '@/utils/googleUsatGate';

/**
 * Router screen for the proving flow that decides whether to skip the document selector.
 *
 * This screen:
 * 1. Loads document catalog and counts valid documents
 * 2. Checks skip settings (skipDocumentSelector, auto-skip on single document)
 * 3. Routes to appropriate screen:
 *    - No valid documents -> DocumentDataNotFound
 *    - Skip enabled -> auto-select and go to Prove
 *    - Otherwise -> DocumentSelectorForProving
 */
const ProvingScreenRouter: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route =
    useRoute<RouteProp<RootStackParamList, 'ProvingScreenRouter'>>();
  const { entryPoint } = route.params;
  const selfClient = useSelfClient();
  const { useSelfAppStore } = selfClient;
  const selfApp = useSelfAppStore(state => state.selfApp);
  const { loadDocumentCatalog, getAllDocuments, setSelectedDocument } =
    usePassport();
  const { skipDocumentSelector } = useSettingStore();
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasRoutedRef = useRef(false);
  const openDocumentSelector = useCallback(
    (documentType: string) => {
      navigation.replace('DocumentSelectorForProving', {
        documentType,
        entryPoint,
      });
    },
    [entryPoint, navigation],
  );

  const handleGoogleUsatBlocked = useCallback(() => {
    selfClient.trackEvent(ProofEvents.GOOGLE_USAT_BLOCKED, {
      entry_point: entryPoint,
      reason: 'no_high_security_doc',
    });
    useVerificationGateStore.getState().open({
      reason: 'google_usat_high_security_required',
      entryPoint,
      requesterName: selfApp?.appName ?? '',
    });
    selfClient.getSelfAppState().cleanSelfApp();
    navigation.goBack();
  }, [entryPoint, navigation, selfApp?.appName, selfClient]);

  const loadAndRoute = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Prevent double routing
    if (hasRoutedRef.current) {
      return;
    }

    // For sessionId-only entries, selfApp arrives asynchronously over the
    // websocket. Wait for it before evaluating the Google USAT gate so we don't
    // navigate past the gate prematurely.
    if (!selfApp) {
      return;
    }

    setError(null);

    try {
      const catalog = await loadDocumentCatalog();
      if (controller.signal.aborted) {
        return;
      }
      const docs = await getAllDocuments();
      if (controller.signal.aborted) {
        return;
      }

      const gate = await evaluateGoogleUsatGate(selfClient, selfApp, {
        catalog,
        docs,
      });
      if (controller.signal.aborted) {
        return;
      }

      // Count valid documents up front so we can derive documentType for the
      // selector even when the gate forces us there.
      const validDocuments = catalog.documents.filter(doc => {
        const docData = docs[doc.id];
        return isDocumentValidForProving(doc, docData?.data);
      });
      const validCount = validDocuments.length;
      const firstValidDoc = validDocuments[0];
      const documentType = getDocumentTypeName(
        firstValidDoc?.documentCategory,
        firstValidDoc?.idType,
      );

      if (gate === 'block') {
        const selectedDocumentId = catalog.selectedDocumentId;
        const hasAlternativeEligibleDocument = selectedDocumentId
          ? hasEligibleAlternativeDocumentForPolicy(
              GOOGLE_USAT_FAUCET_POLICY,
              docs,
              selectedDocumentId,
            )
          : false;

        let hasAlternativeEligibleValidDocument = false;
        if (hasAlternativeEligibleDocument && selectedDocumentId) {
          const alternativeValidDocuments = validDocuments.filter(
            doc => doc.id !== selectedDocumentId,
          );
          for (const doc of alternativeValidDocuments) {
            const alternativeDocGate = await evaluateGoogleUsatGateForDocument(
              selfClient,
              selfApp,
              doc.id,
              docs,
            );
            if (controller.signal.aborted) {
              return;
            }
            if (alternativeDocGate === 'allow') {
              hasAlternativeEligibleValidDocument = true;
              break;
            }
          }
        }

        if (hasAlternativeEligibleValidDocument) {
          // Force selector regardless of skipDocumentSelector so the user can
          // pick the eligible alternative.
          hasRoutedRef.current = true;
          openDocumentSelector(documentType);
          return;
        }

        hasRoutedRef.current = true;
        handleGoogleUsatBlocked();
        return;
      }

      // Mark as routed to prevent re-routing
      hasRoutedRef.current = true;

      // Route based on document availability and skip settings
      if (validCount === 0) {
        // No valid documents - redirect to onboarding
        navigation.replace('DocumentDataNotFound');
        return;
      }

      // Determine if we should skip the selector
      const shouldSkip = skipDocumentSelector || validCount === 1;

      if (!shouldSkip) {
        openDocumentSelector(documentType);
        return;
      }

      // Auto-select and navigate to Prove
      const docToSelect = pickBestDocumentToSelect(catalog, docs);
      if (!docToSelect) {
        openDocumentSelector(documentType);
        return;
      }

      try {
        const selectedDocGate = await evaluateGoogleUsatGateForDocument(
          selfClient,
          selfApp,
          docToSelect,
          docs,
        );
        if (controller.signal.aborted) {
          return;
        }
        if (selectedDocGate === 'block') {
          handleGoogleUsatBlocked();
          return;
        }
        await setSelectedDocument(docToSelect);
        navigation.replace('Prove');
      } catch (selectError) {
        console.error('Failed to auto-select document:', selectError);
        // On error, fall back to showing the selector
        hasRoutedRef.current = false;
        openDocumentSelector(documentType);
      }
    } catch (loadError) {
      // Don't show error if this request was aborted
      if (controller.signal.aborted) {
        return;
      }
      console.warn('Failed to load documents for routing:', loadError);
      setError('Unable to load documents.');
      // Reset routed flag to allow retry
      hasRoutedRef.current = false;
    }
  }, [
    getAllDocuments,
    loadDocumentCatalog,
    navigation,
    selfApp,
    selfClient,
    handleGoogleUsatBlocked,
    openDocumentSelector,
    setSelectedDocument,
    skipDocumentSelector,
  ]);

  useFocusEffect(
    useCallback(() => {
      // Reset routing flag when screen gains focus
      hasRoutedRef.current = false;
      loadAndRoute();
    }, [loadAndRoute]),
  );

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <View
      flex={1}
      backgroundColor={proofRequestColors.white}
      alignItems="center"
      justifyContent="center"
      testID="proving-router-container"
    >
      {error ? (
        <View alignItems="center" gap={16}>
          <Text
            fontFamily={dinot}
            fontSize={16}
            color={proofRequestColors.slate500}
            textAlign="center"
            testID="proving-router-error"
          >
            {error}
          </Text>
          <View
            paddingHorizontal={24}
            paddingVertical={12}
            borderRadius={8}
            borderWidth={1}
            borderColor={proofRequestColors.slate200}
            onPress={() => {
              hasRoutedRef.current = false;
              loadAndRoute();
            }}
            pressStyle={{ opacity: 0.7 }}
            testID="proving-router-retry"
          >
            <Text
              fontFamily={dinot}
              fontSize={16}
              color={proofRequestColors.slate500}
            >
              Retry
            </Text>
          </View>
        </View>
      ) : (
        <>
          <ActivityIndicator color={black} size="large" />
        </>
      )}
    </View>
  );
};

export { ProvingScreenRouter };
