// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { commonNames } from '@selfxyz/common/constants/countries';
import { formatEndpoint } from '@selfxyz/common/utils/scope';
import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  black,
  blue600,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { IDSelectorState } from '@/components/documents';
import { IDSelectorItem, isDisabledState } from '@/components/documents';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import {
  checkDocumentExpiration,
  getDocumentAttributes,
} from '@/utils/documentAttributes';

/**
 * Converts a 3-letter country code to its full country name
 */
function getCountryName(countryCode: string | null): string | null {
  if (!countryCode) return null;
  return commonNames[countryCode as keyof typeof commonNames] || null;
}

function getDocumentDisplayName(
  metadata: DocumentMetadata,
  documentData?: IDDocument,
): string {
  const category = metadata.documentCategory || '';
  const isMock = metadata.mock;

  // Extract country information from document data
  let countryCode: string | null = null;
  if (documentData) {
    try {
      const attributes = getDocumentAttributes(documentData);
      countryCode = attributes.nationalitySlice || null;
    } catch {
      // If we can't extract attributes, continue without country
    }
  }

  const countryName = getCountryName(countryCode);
  const mockPrefix = isMock ? 'Developer ' : '';

  if (category === 'passport') {
    const base = 'Passport';
    return countryName
      ? `${mockPrefix}${countryName} ${base}`
      : `${mockPrefix}${base}`;
  } else if (category === 'id_card') {
    const base = 'ID Card';
    return countryName
      ? `${mockPrefix}${countryName} ${base}`
      : `${mockPrefix}${base}`;
  } else if (category === 'aadhaar') {
    return isMock ? 'Developer Aadhaar ID' : 'Aadhaar ID';
  }

  return isMock ? `Developer ${metadata.documentType}` : metadata.documentType;
}

function determineDocumentState(
  metadata: DocumentMetadata,
  documentData: IDDocument | undefined,
): IDSelectorState {
  // Mock documents are not accepted
  if (metadata.mock) {
    return 'not_accepted';
  }

  // Check if expired
  if (documentData) {
    try {
      const attributes = getDocumentAttributes(documentData);
      if (
        attributes.expiryDateSlice &&
        checkDocumentExpiration(attributes.expiryDateSlice)
      ) {
        return 'expired';
      }
    } catch {
      // If we can't check expiry, assume valid
    }
  }

  // Both registered and non-registered real documents are valid for selection
  // They will be registered during the proving flow if needed
  return 'verified';
}

const DocumentSelectorForProvingScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const selfClient = useSelfClient();
  const { useSelfAppStore } = selfClient;
  const selfApp = useSelfAppStore(state => state.selfApp);
  const { loadDocumentCatalog, getAllDocuments, setSelectedDocument } =
    usePassport();

  const [documentCatalog, setDocumentCatalog] = useState<DocumentCatalog>({
    documents: [],
  });
  const [allDocuments, setAllDocuments] = useState<
    Record<string, { data: IDDocument; metadata: DocumentMetadata }>
  >({});
  const [selectedDocumentId, setSelectedDocumentId] = useState<
    string | undefined
  >();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const logoSource = useMemo(() => {
    if (!selfApp?.logoBase64) {
      return null;
    }

    if (
      selfApp.logoBase64.startsWith('http://') ||
      selfApp.logoBase64.startsWith('https://')
    ) {
      return { uri: selfApp.logoBase64 };
    }

    const base64String = selfApp.logoBase64.startsWith('data:image')
      ? selfApp.logoBase64
      : `data:image/png;base64,${selfApp.logoBase64}`;
    return { uri: base64String };
  }, [selfApp?.logoBase64]);

  const url = useMemo(() => {
    if (!selfApp?.endpoint) {
      return null;
    }
    return formatEndpoint(selfApp.endpoint);
  }, [selfApp?.endpoint]);

  const pickInitialDocument = useCallback(
    (
      catalog: DocumentCatalog,
      docs: Record<string, { data: IDDocument; metadata: DocumentMetadata }>,
    ) => {
      if (catalog.selectedDocumentId) {
        const selectedMeta = catalog.documents.find(
          doc => doc.id === catalog.selectedDocumentId,
        );
        const selectedData = selectedMeta
          ? docs[catalog.selectedDocumentId]
          : undefined;

        if (selectedMeta && selectedData) {
          const state = determineDocumentState(selectedMeta, selectedData.data);
          if (!isDisabledState(state)) {
            return catalog.selectedDocumentId;
          }
        } else if (selectedMeta) {
          return catalog.selectedDocumentId;
        }
      }

      const firstValid = catalog.documents.find(doc => {
        const docData = docs[doc.id];
        const state = determineDocumentState(doc, docData?.data);
        return !isDisabledState(state);
      });

      return firstValid?.id;
    },
    [],
  );

  const loadDocuments = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const catalog = await loadDocumentCatalog();
      const docs = await getAllDocuments();

      // Don't update state if this request was aborted
      if (controller.signal.aborted) {
        return;
      }

      setDocumentCatalog(catalog);
      setAllDocuments(docs);
      setSelectedDocumentId(pickInitialDocument(catalog, docs));
    } catch (loadError) {
      // Don't show error if this request was aborted
      if (controller.signal.aborted) {
        return;
      }
      console.warn('Failed to load documents:', loadError);
      setError('Unable to load documents.');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [getAllDocuments, loadDocumentCatalog, pickInitialDocument]);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments]),
  );

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const documents = useMemo(() => {
    return documentCatalog.documents
      .map(metadata => {
        const docData = allDocuments[metadata.id];
        const baseState = determineDocumentState(metadata, docData?.data);
        const isSelected = metadata.id === selectedDocumentId;
        const itemState =
          isSelected && !isDisabledState(baseState) ? 'active' : baseState;

        return {
          id: metadata.id,
          name: getDocumentDisplayName(metadata, docData?.data),
          state: itemState,
        };
      })
      .sort((a, b) => {
        // Get metadata for both documents
        const metaA = documentCatalog.documents.find(d => d.id === a.id);
        const metaB = documentCatalog.documents.find(d => d.id === b.id);

        // Sort real documents before mock documents
        if (metaA && metaB) {
          if (metaA.mock !== metaB.mock) {
            return metaA.mock ? 1 : -1; // Real first
          }
        }

        // Within same type (real/mock), sort alphabetically by name
        return a.name.localeCompare(b.name);
      });
  }, [allDocuments, documentCatalog.documents, selectedDocumentId]);

  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);
  const canContinue =
    !!selectedDocument && !isDisabledState(selectedDocument.state);

  const handleSelect = (documentId: string) => {
    const document = documents.find(doc => doc.id === documentId);
    if (!document || isDisabledState(document.state)) {
      return;
    }
    setSelectedDocumentId(documentId);
  };

  const handleContinue = async () => {
    if (!selectedDocumentId || !canContinue || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await setSelectedDocument(selectedDocumentId);
      navigation.navigate('Prove');
    } catch (selectionError) {
      console.error('Failed to set selected document:', selectionError);
      setError('Failed to select document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Compact Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          {logoSource ? (
            <Image
              source={logoSource}
              style={styles.logo}
              resizeMode="contain"
              testID="document-selector-logo"
            />
          ) : null}
          <View style={styles.headerTextContainer}>
            <Text style={styles.appName} numberOfLines={1}>
              {selfApp?.appName || 'Self'}
            </Text>
            {url ? (
              <Text
                style={styles.appUrl}
                numberOfLines={1}
                testID="document-selector-app-url"
              >
                {url}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.headerDescription}>
          Select an ID to prove your information
        </Text>
      </View>

      {/* Main Content - Document List */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select an ID</Text>
        {loading ? (
          <View style={styles.statusContainer}>
            <ActivityIndicator color={blue600} size="small" />
            <Text style={styles.statusText} testID="document-selector-loading">
              Loading documents...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText} testID="document-selector-error">
              {error}
            </Text>
            <Pressable
              onPress={loadDocuments}
              style={[styles.actionButton, styles.retryButton]}
              testID="document-selector-retry"
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText} testID="document-selector-empty">
              No documents found. Please scan a document first.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.list}
            testID="document-selector-list"
          >
            {documents.map(doc => (
              <IDSelectorItem
                key={doc.id}
                documentName={doc.name}
                state={doc.state}
                onPress={() => handleSelect(doc.id)}
                testID={`document-selector-item-${doc.id}`}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Footer Button */}
      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue || submitting}
          style={({ pressed }) => [
            styles.continueButton,
            {
              backgroundColor: canContinue && !submitting ? blue600 : slate300,
              opacity: canContinue && !submitting ? (pressed ? 0.8 : 1) : 0.5,
            },
          ]}
          testID="document-selector-continue"
        >
          {submitting ? (
            <ActivityIndicator color={white} size="small" />
          ) : (
            <Text style={styles.continueButtonText}>Continue to Proof</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: white,
  },
  header: {
    backgroundColor: black,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  logo: {
    width: 40,
    height: 40,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: white,
    fontFamily: dinot,
  },
  appUrl: {
    fontSize: 12,
    color: slate300,
    fontFamily: dinot,
    marginTop: 2,
  },
  headerDescription: {
    fontSize: 14,
    color: slate300,
    fontFamily: dinot,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: black,
    fontFamily: dinot,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  list: {
    paddingBottom: 16,
  },
  statusContainer: {
    flex: 1,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 16,
    color: slate500,
    textAlign: 'center',
    fontFamily: dinot,
  },
  actionButton: {
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: slate300,
    backgroundColor: white,
  },
  retryButtonText: {
    fontSize: 16,
    color: slate500,
    fontFamily: dinot,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: white,
    borderTopWidth: 1,
    borderTopColor: slate300,
  },
  continueButton: {
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    color: white,
    fontFamily: dinot,
  },
});

export { DocumentSelectorForProvingScreen };
