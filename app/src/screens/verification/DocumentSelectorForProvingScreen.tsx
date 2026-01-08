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
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Text, View, YStack } from 'tamagui';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { commonNames } from '@selfxyz/common/constants/countries';
import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils/appType';
import { formatEndpoint } from '@selfxyz/common/utils/scope';
import type {
  DocumentCatalog,
  DocumentMetadata,
  IDDocument,
} from '@selfxyz/common/utils/types';
import {
  getDocumentAttributes,
  isDocumentValidForProving,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { blue600, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import type { IDSelectorState } from '@/components/documents';
import { IDSelectorSheet, isDisabledState } from '@/components/documents';
import {
  BottomActionBar,
  ConnectedWalletBadge,
  DisclosureItem,
  ProofRequestCard,
  proofRequestColors,
  truncateAddress,
  WalletAddressModal,
} from '@/components/proof-request';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { getDisclosureItems } from '@/utils/disclosureUtils';
import { formatUserId } from '@/utils/formatUserId';

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

/**
 * Gets the document type display name for the proof request message.
 */
function getDocumentTypeName(category: string | undefined): string {
  switch (category) {
    case 'passport':
      return 'Passport';
    case 'id_card':
      return 'ID Card';
    case 'aadhaar':
      return 'Aadhaar';
    default:
      return 'Document';
  }
}

function determineDocumentState(
  metadata: DocumentMetadata,
  documentData: IDDocument | undefined,
): IDSelectorState {
  // Use SDK to check if document is valid (not expired)
  if (!isDocumentValidForProving(metadata, documentData)) {
    return 'expired';
  }

  // UI-specific state mapping: Mock documents are selectable but marked as developer/mock
  if (metadata.mock) {
    return 'mock';
  }

  // Both registered and non-registered real documents are valid for selection
  // They will be registered during the proving flow if needed
  return 'verified';
}

const DocumentSelectorForProvingScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollOffsetRef = useRef(0);

  // Memoized values from selfApp
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

  const disclosures = useMemo(
    () => (selfApp?.disclosures as SelfAppDisclosureConfig) || {},
    [selfApp?.disclosures],
  );

  const disclosureItems = useMemo(
    () => getDisclosureItems(disclosures),
    [disclosures],
  );

  const formattedUserId = useMemo(
    () => formatUserId(selfApp?.userId, selfApp?.userIdType),
    [selfApp?.userId, selfApp?.userIdType],
  );

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

  // Get document type for the proof request message
  const selectedDocumentType = useMemo(() => {
    if (!selectedDocumentId) return 'Document';
    const metadata = documentCatalog.documents.find(
      d => d.id === selectedDocumentId,
    );
    return getDocumentTypeName(metadata?.documentCategory);
  }, [selectedDocumentId, documentCatalog.documents]);

  const handleSelect = useCallback((documentId: string) => {
    setSelectedDocumentId(documentId);
  }, []);

  const handleApprove = async () => {
    if (!selectedDocumentId || !canContinue || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSheetOpen(false);
    try {
      await setSelectedDocument(selectedDocumentId);
      navigation.navigate('Prove', { scrollOffset: scrollOffsetRef.current });
    } catch (selectionError) {
      console.error('Failed to set selected document:', selectionError);
      setError('Failed to select document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View
        flex={1}
        backgroundColor={proofRequestColors.white}
        alignItems="center"
        justifyContent="center"
        testID="document-selector-loading-container"
      >
        <ActivityIndicator color={blue600} size="large" />
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={proofRequestColors.slate500}
          marginTop={16}
          testID="document-selector-loading"
        >
          Loading documents...
        </Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View
        flex={1}
        backgroundColor={proofRequestColors.white}
        alignItems="center"
        justifyContent="center"
        gap={16}
      >
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={proofRequestColors.slate500}
          textAlign="center"
          testID="document-selector-error"
        >
          {error}
        </Text>
        <View
          paddingHorizontal={24}
          paddingVertical={12}
          borderRadius={8}
          borderWidth={1}
          borderColor={proofRequestColors.slate200}
          onPress={loadDocuments}
          pressStyle={{ opacity: 0.7 }}
          testID="document-selector-retry"
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
    );
  }

  // Empty state
  if (documents.length === 0) {
    return (
      <View
        flex={1}
        backgroundColor={proofRequestColors.white}
        alignItems="center"
        justifyContent="center"
      >
        <Text
          fontFamily={dinot}
          fontSize={16}
          color={proofRequestColors.slate500}
          textAlign="center"
          paddingHorizontal={40}
          testID="document-selector-empty"
        >
          No documents found. Please scan a document first.
        </Text>
      </View>
    );
  }

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      {/* Main Content - Proof Request Card */}
      <ProofRequestCard
        logoSource={logoSource}
        appName={selfApp?.appName || 'Self'}
        appUrl={url}
        documentType={selectedDocumentType}
        onScroll={handleScroll}
        testID="document-selector-card"
      >
        {/* Connected Wallet Badge */}
        {formattedUserId && (
          <ConnectedWalletBadge
            address={
              selfApp?.userIdType === 'hex'
                ? truncateAddress(selfApp?.userId || '')
                : formattedUserId
            }
            userIdType={selfApp?.userIdType}
            onToggle={() => setWalletModalOpen(true)}
            testID="document-selector-wallet-badge"
          />
        )}

        {/* Disclosure Items */}
        <YStack marginTop={formattedUserId ? 16 : 0}>
          {disclosureItems.map((item, index) => (
            <DisclosureItem
              key={item.key}
              text={item.text}
              verified={true}
              isLast={index === disclosureItems.length - 1}
              testID={`document-selector-disclosure-${item.key}`}
            />
          ))}
        </YStack>
      </ProofRequestCard>

      {/* Bottom Action Bar */}
      <BottomActionBar
        selectedDocumentName={selectedDocument?.name || 'Select ID'}
        onDocumentSelectorPress={() => setSheetOpen(true)}
        onApprovePress={handleApprove}
        approveDisabled={!canContinue}
        approving={submitting}
        testID="document-selector-action-bar"
      />

      {/* ID Selector Sheet */}
      <IDSelectorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        documents={documents}
        selectedId={selectedDocumentId}
        onSelect={handleSelect}
        onDismiss={() => setSheetOpen(false)}
        onApprove={handleApprove}
        testID="document-selector-sheet"
      />

      {/* Wallet Address Modal */}
      {formattedUserId && selfApp?.userId && (
        <WalletAddressModal
          visible={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
          address={selfApp.userId}
          userIdType={selfApp?.userIdType}
          testID="document-selector-wallet-modal"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: white,
  },
});

export { DocumentSelectorForProvingScreen };
