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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import {
  checkDocumentExpiration,
  getDocumentAttributes,
} from '@/utils/documentAttributes';

function getDocumentDisplayName(metadata: DocumentMetadata): string {
  const docType = metadata.documentType?.toUpperCase() || 'Document';
  const category = metadata.documentCategory || '';

  if (category === 'passport') {
    return `${docType} Passport`;
  } else if (category === 'id_card') {
    return `${docType} ID Card`;
  } else if (category === 'aadhaar') {
    return 'Aadhaar ID';
  }

  return docType;
}

function determineDocumentState(
  metadata: DocumentMetadata,
  documentData: IDDocument | undefined,
): IDSelectorState {
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

  if (metadata.isRegistered) {
    return 'verified';
  }

  return 'not_accepted';
}

const DocumentSelectorForProvingScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const { useSelfAppStore } = selfClient;
  const selfApp = useSelfAppStore(state => state.selfApp);
  const { loadDocumentCatalog, getAllDocuments, setSelectedDocument } =
    usePassport();
  const { skipDocumentSelector, skipDocumentSelectorIfSingle } =
    useSettingStore();

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
  const hasAttemptedSkipRef = useRef(false);

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

    // Reset skip attempt flag when reloading
    hasAttemptedSkipRef.current = false;

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
    return documentCatalog.documents.map(metadata => {
      const docData = allDocuments[metadata.id];
      const baseState = determineDocumentState(metadata, docData?.data);
      const isSelected = metadata.id === selectedDocumentId;
      const itemState =
        isSelected && !isDisabledState(baseState) ? 'active' : baseState;

      return {
        id: metadata.id,
        name: getDocumentDisplayName(metadata),
        state: itemState,
      };
    });
  }, [allDocuments, documentCatalog.documents, selectedDocumentId]);

  const validDocuments = useMemo(
    () => documents.filter(doc => !isDisabledState(doc.state)),
    [documents],
  );

  const selectedDocument = documents.find(doc => doc.id === selectedDocumentId);
  const canContinue =
    !!selectedDocument && !isDisabledState(selectedDocument.state);

  // Auto-redirect based on document availability and skip settings
  useEffect(() => {
    if (loading || error || hasAttemptedSkipRef.current) {
      return;
    }

    // No documents - redirect to onboarding
    if (validDocuments.length === 0) {
      hasAttemptedSkipRef.current = true;
      navigation.replace('DocumentDataNotFound');
      return;
    }

    // Check skip settings
    const shouldSkip =
      skipDocumentSelector ||
      (skipDocumentSelectorIfSingle && validDocuments.length === 1);

    if (shouldSkip) {
      hasAttemptedSkipRef.current = true;
      // Auto-select and navigate to Prove screen
      const docToSelect = selectedDocumentId || validDocuments[0].id;
      setSelectedDocument(docToSelect)
        .then(() => {
          navigation.replace('Prove');
        })
        .catch(skipError => {
          console.error('Failed to auto-select document:', skipError);
          // On error, reset flag to allow retry or manual selection
          hasAttemptedSkipRef.current = false;
        });
    }
  }, [
    loading,
    error,
    validDocuments,
    skipDocumentSelector,
    skipDocumentSelectorIfSingle,
    selectedDocumentId,
    setSelectedDocument,
    navigation,
  ]);

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
    <ExpandableBottomLayout.Layout flex={1} backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <View style={styles.topSection}>
          {logoSource ? (
            <Image
              source={logoSource}
              style={styles.logo}
              resizeMode="contain"
              testID="document-selector-logo"
            />
          ) : null}
          {url ? (
            <Text style={styles.appUrl} testID="document-selector-app-url">
              {url}
            </Text>
          ) : null}
          <Text style={styles.title}>
            <Text style={styles.appName}>{selfApp?.appName || 'Self'}</Text>{' '}
            <Text style={styles.titleMuted}>
              is requesting you to select an ID to prove your information.
            </Text>
          </Text>
        </View>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        backgroundColor={white}
        maxHeight="60%"
      >
        <View style={styles.bottomSection}>
          {loading ? (
            <Text style={styles.statusText} testID="document-selector-loading">
              Loading documents...
            </Text>
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
          ) : validDocuments.length === 0 ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator color={blue600} size="small" />
              <Text style={styles.statusText} testID="document-selector-empty">
                Redirecting to add a document...
              </Text>
            </View>
          ) : skipDocumentSelector ||
            (skipDocumentSelectorIfSingle && validDocuments.length === 1) ? (
            <View style={styles.statusContainer}>
              <ActivityIndicator color={blue600} size="small" />
              <Text style={styles.statusText} testID="document-selector-skip">
                Preparing proof...
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
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
          <Pressable
            onPress={handleContinue}
            disabled={!canContinue || submitting}
            style={({ pressed }) => [
              styles.continueButton,
              {
                backgroundColor:
                  canContinue && !submitting ? blue600 : slate300,
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
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

const styles = StyleSheet.create({
  topSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 20,
  },
  appUrl: {
    fontSize: 12,
    color: slate300,
    marginBottom: 20,
    fontFamily: dinot,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    color: slate300,
    fontFamily: dinot,
  },
  appName: {
    color: white,
    fontFamily: dinot,
  },
  titleMuted: {
    color: slate300,
    fontFamily: dinot,
  },
  bottomSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  list: {
    paddingBottom: 12,
  },
  statusContainer: {
    gap: 12,
    alignItems: 'center',
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
