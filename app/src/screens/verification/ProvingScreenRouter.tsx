// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Text, View } from 'tamagui';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  isDocumentValidForProving,
  pickBestDocumentToSelect,
} from '@selfxyz/mobile-sdk-alpha';
import { black } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { proofRequestColors } from '@/components/proof-request';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import { getDocumentTypeName } from '@/utils/documentUtils';

/**
 * Router screen for the proving flow that decides whether to skip the document selector.
 *
 * This screen:
 * 1. Loads document catalog and counts valid documents
 * 2. Checks skip settings (skipDocumentSelector, skipDocumentSelectorIfSingle)
 * 3. Routes to appropriate screen:
 *    - No valid documents -> DocumentDataNotFound
 *    - Skip enabled -> auto-select and go to Prove
 *    - Otherwise -> DocumentSelectorForProving
 */
const ProvingScreenRouter: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { loadDocumentCatalog, getAllDocuments, setSelectedDocument } =
    usePassport();
  const { skipDocumentSelector, skipDocumentSelectorIfSingle } =
    useSettingStore();
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasRoutedRef = useRef(false);

  const loadAndRoute = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Prevent double routing
    if (hasRoutedRef.current) {
      return;
    }

    setError(null);
    try {
      const catalog = await loadDocumentCatalog();
      const docs = await getAllDocuments();

      // Don't continue if this request was aborted
      if (controller.signal.aborted) {
        return;
      }

      // Count valid documents
      const validDocuments = catalog.documents.filter(doc => {
        const docData = docs[doc.id];
        return isDocumentValidForProving(doc, docData?.data);
      });

      const validCount = validDocuments.length;

      // Mark as routed to prevent re-routing
      hasRoutedRef.current = true;

      // Route based on document availability and skip settings
      if (validCount === 0) {
        // No valid documents - redirect to onboarding
        navigation.replace('DocumentDataNotFound');
        return;
      }

      // Determine document type from first valid document for display
      const firstValidDoc = validDocuments[0];
      const documentType = getDocumentTypeName(firstValidDoc?.documentCategory);

      // Determine if we should skip the selector
      const shouldSkip =
        skipDocumentSelector ||
        (skipDocumentSelectorIfSingle && validCount === 1);

      if (shouldSkip) {
        // Auto-select and navigate to Prove
        const docToSelect = pickBestDocumentToSelect(catalog, docs);
        if (docToSelect) {
          try {
            await setSelectedDocument(docToSelect);
            navigation.replace('Prove');
          } catch (selectError) {
            console.error('Failed to auto-select document:', selectError);
            // On error, fall back to showing the selector
            hasRoutedRef.current = false;
            navigation.replace('DocumentSelectorForProving', {
              documentType,
            });
          }
        } else {
          // No valid document to select, show selector
          navigation.replace('DocumentSelectorForProving', {
            documentType,
          });
        }
      } else {
        // Show the document selector
        navigation.replace('DocumentSelectorForProving', {
          documentType,
        });
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
    setSelectedDocument,
    skipDocumentSelector,
    skipDocumentSelectorIfSingle,
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
