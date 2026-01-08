// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';
import {
  black,
  blue600,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import {
  checkDocumentExpiration,
  getDocumentAttributes,
} from '@/utils/documentAttributes';

/**
 * Determines if a document is valid for selection (not expired).
 * Mock documents are valid for testing with staging environments.
 */
function isValidDocument(
  metadata: DocumentMetadata,
  documentData: IDDocument | undefined,
): boolean {
  // Check if expired
  if (documentData) {
    try {
      const attributes = getDocumentAttributes(documentData);
      if (
        attributes.expiryDateSlice &&
        checkDocumentExpiration(attributes.expiryDateSlice)
      ) {
        return false;
      }
    } catch {
      // If we can't check expiry, assume valid
    }
  }

  return true;
}

/**
 * Picks the best document to auto-select.
 * Prefers the currently selected document if valid, otherwise picks the first valid one.
 */
function pickDocumentToSelect(
  catalog: DocumentCatalog,
  docs: Record<string, { data: IDDocument; metadata: DocumentMetadata }>,
): string | undefined {
  // Check if currently selected document is valid
  if (catalog.selectedDocumentId) {
    const selectedMeta = catalog.documents.find(
      doc => doc.id === catalog.selectedDocumentId,
    );
    const selectedData = selectedMeta
      ? docs[catalog.selectedDocumentId]
      : undefined;

    if (selectedMeta && isValidDocument(selectedMeta, selectedData?.data)) {
      return catalog.selectedDocumentId;
    }
  }

  // Find first valid document
  const firstValid = catalog.documents.find(doc => {
    const docData = docs[doc.id];
    return isValidDocument(doc, docData?.data);
  });

  return firstValid?.id;
}

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
        return isValidDocument(doc, docData?.data);
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

      // Determine if we should skip the selector
      const shouldSkip =
        skipDocumentSelector ||
        (skipDocumentSelectorIfSingle && validCount === 1);

      if (shouldSkip) {
        // Auto-select and navigate to Prove
        const docToSelect = pickDocumentToSelect(catalog, docs);
        if (docToSelect) {
          try {
            await setSelectedDocument(docToSelect);
            navigation.replace('Prove');
          } catch (selectError) {
            console.error('Failed to auto-select document:', selectError);
            // On error, fall back to showing the selector
            hasRoutedRef.current = false;
            navigation.replace('DocumentSelectorForProving');
          }
        } else {
          // No valid document to select, show selector
          navigation.replace('DocumentSelectorForProving');
        }
      } else {
        // Show the document selector
        navigation.replace('DocumentSelectorForProving');
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
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text
            style={styles.retryText}
            onPress={() => {
              hasRoutedRef.current = false;
              loadAndRoute();
            }}
          >
            Tap to retry
          </Text>
        </View>
      ) : (
        <>
          <ActivityIndicator color={blue600} size="large" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: white,
    fontFamily: dinot,
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: white,
    fontFamily: dinot,
    textAlign: 'center',
  },
  retryText: {
    fontSize: 14,
    color: blue600,
    fontFamily: dinot,
  },
});

export { ProvingScreenRouter };
