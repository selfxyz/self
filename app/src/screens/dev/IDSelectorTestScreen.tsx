// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { Button, ScrollView, Text, YStack } from 'tamagui';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { commonNames } from '@selfxyz/common/constants/countries';
import type { DocumentCatalog, IDDocument } from '@selfxyz/common/utils/types';
import type { DocumentMetadata } from '@selfxyz/mobile-sdk-alpha';
import {
  black,
  blue600,
  slate50,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import type {
  IDSelectorDocument,
  IDSelectorState,
} from '@/components/documents';
import { IDSelectorSheet, isDisabledState } from '@/components/documents';
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
  // Check if expired first (applies to both real and mock documents)
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

  // Mock documents are selectable but marked as developer/mock
  if (metadata.mock) {
    return 'mock';
  }

  // Both registered and non-registered real documents are valid for selection
  return 'verified';
}

const IDSelectorTestScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getAllDocuments, loadDocumentCatalog, setSelectedDocument } =
    usePassport();
  const bottomPadding = useSafeBottomPadding(20);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  // Real documents state
  const [documentCatalog, setDocumentCatalog] = useState<DocumentCatalog>({
    documents: [],
  });
  const [allDocuments, setAllDocuments] = useState<
    Record<string, { data: IDDocument; metadata: DocumentMetadata }>
  >({});
  const [loading, setLoading] = useState(false);

  // Load real documents
  const loadRealDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await loadDocumentCatalog();
      const docs = await getAllDocuments();
      setDocumentCatalog(catalog);
      setAllDocuments(docs);

      // Determine the best document to select
      if (catalog.selectedDocumentId) {
        const selectedMeta = catalog.documents.find(
          d => d.id === catalog.selectedDocumentId,
        );
        const docData = docs[catalog.selectedDocumentId];

        // Check if selected doc is still valid (not expired or unregistered)
        if (selectedMeta && docData) {
          const state = determineDocumentState(selectedMeta, docData.data);
          if (isDisabledState(state)) {
            // Find first valid document instead
            const firstValid = catalog.documents.find(d => {
              const dd = docs[d.id];
              const st = determineDocumentState(d, dd?.data);
              return !isDisabledState(st);
            });
            setSelectedId(firstValid?.id);
          } else {
            setSelectedId(catalog.selectedDocumentId);
          }
        } else {
          setSelectedId(catalog.selectedDocumentId);
        }
      }
    } catch (error) {
      console.warn('Failed to load documents:', error);
    }
    setLoading(false);
  }, [loadDocumentCatalog, getAllDocuments]);

  // Load real documents on focus
  useFocusEffect(
    useCallback(() => {
      loadRealDocuments();
    }, [loadRealDocuments]),
  );

  // Convert real documents to IDSelectorDocument format and sort them
  const documents: IDSelectorDocument[] = documentCatalog.documents
    .map(metadata => {
      const docData = allDocuments[metadata.id];

      return {
        id: metadata.id,
        name: getDocumentDisplayName(metadata, docData?.data),
        state: determineDocumentState(metadata, docData?.data),
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

  const selectedDocument = documents.find(doc => doc.id === selectedId);
  const selectedName = selectedDocument?.name || 'None';

  const handleSelect = (documentId: string) => {
    setSelectedId(documentId);
  };

  const handleApprove = async () => {
    setSheetOpen(false);

    if (selectedId) {
      try {
        await setSelectedDocument(selectedId);
        // Reload to reflect changes
        await loadRealDocuments();
      } catch (error) {
        console.warn('Failed to set selected document:', error);
      }
    }
  };

  const handleDismiss = () => {
    setSheetOpen(false);
    // Reset selection to previous on dismiss
    if (documentCatalog.selectedDocumentId) {
      setSelectedId(documentCatalog.selectedDocumentId);
    }
  };

  const handleGenerateMock = () => {
    navigation.navigate('CreateMock');
  };

  return (
    <YStack
      flex={1}
      backgroundColor={slate50}
      paddingHorizontal={20}
      paddingBottom={bottomPadding}
    >
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack gap={24} paddingTop={20}>
          {/* Title */}
          <Text fontFamily={dinot} fontSize={24} fontWeight="600" color={black}>
            ID Selector Test
          </Text>

          {loading ? (
            /* Loading State */
            <YStack
              backgroundColor={white}
              borderRadius={12}
              padding={24}
              borderWidth={1}
              borderColor={slate300}
              gap={16}
              alignItems="center"
            >
              <Text
                fontFamily={dinot}
                fontSize={18}
                fontWeight="600"
                color={black}
                textAlign="center"
              >
                Loading documents...
              </Text>
              <Text
                fontFamily={dinot}
                fontSize={14}
                color={slate500}
                textAlign="center"
              >
                Please wait while we fetch your documents
              </Text>
            </YStack>
          ) : documents.length === 0 ? (
            /* Empty State */
            <YStack
              backgroundColor={white}
              borderRadius={12}
              padding={24}
              borderWidth={1}
              borderColor={slate300}
              gap={16}
              alignItems="center"
            >
              <Text
                fontFamily={dinot}
                fontSize={18}
                fontWeight="600"
                color={black}
                textAlign="center"
              >
                No documents available
              </Text>
              <Text
                fontFamily={dinot}
                fontSize={14}
                color={slate500}
                textAlign="center"
              >
                Generate a mock document to test the ID selector
              </Text>
              <Button
                backgroundColor={blue600}
                borderRadius={8}
                height={52}
                onPress={handleGenerateMock}
                testID="generate-mock-document-button"
              >
                <Text
                  fontFamily={dinot}
                  fontSize={16}
                  fontWeight="500"
                  color={white}
                >
                  Generate Mock Document
                </Text>
              </Button>
            </YStack>
          ) : (
            <>
              {/* Current Selection Display */}
              <YStack
                backgroundColor={white}
                borderRadius={12}
                padding={16}
                borderWidth={1}
                borderColor={slate300}
                gap={8}
              >
                <Text fontFamily={dinot} fontSize={14} color={slate500}>
                  Current Selection:
                </Text>
                <Text
                  fontFamily={dinot}
                  fontSize={18}
                  fontWeight="600"
                  color={black}
                >
                  {loading ? 'Loading...' : `Selected: ${selectedName}`}
                </Text>
              </YStack>

              {/* Document Count */}
              <YStack
                backgroundColor={white}
                borderRadius={12}
                padding={16}
                borderWidth={1}
                borderColor={slate300}
                gap={8}
              >
                <Text fontFamily={dinot} fontSize={14} color={slate500}>
                  Available Documents:
                </Text>
                <Text fontFamily={dinot} fontSize={16} color={black}>
                  {documents.length} document{documents.length !== 1 ? 's' : ''}
                </Text>
                {documents.map(doc => (
                  <Text
                    key={doc.id}
                    fontFamily={dinot}
                    fontSize={14}
                    color={slate500}
                  >
                    • {doc.name} ({doc.state})
                  </Text>
                ))}
              </YStack>

              {/* Open Sheet Button */}
              <Button
                backgroundColor={blue600}
                borderRadius={8}
                height={52}
                onPress={() => setSheetOpen(true)}
                testID="open-id-selector-button"
              >
                <Text
                  fontFamily={dinot}
                  fontSize={16}
                  fontWeight="500"
                  color={white}
                >
                  Open ID Selector
                </Text>
              </Button>
            </>
          )}
        </YStack>
      </ScrollView>

      {/* ID Selector Sheet */}
      <IDSelectorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        documents={documents}
        selectedId={selectedId}
        onSelect={handleSelect}
        onDismiss={handleDismiss}
        onApprove={handleApprove}
        testID="id-selector-test-sheet"
      />
    </YStack>
  );
};

export default IDSelectorTestScreen;
