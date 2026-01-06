// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { Button, ScrollView, Text, YStack } from 'tamagui';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
import { IDSelectorSheet } from '@/components/documents';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
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
  isSelected: boolean,
): IDSelectorState {
  // If selected, show as active
  if (isSelected) {
    return 'active';
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

  // If registered, show as verified
  if (metadata.isRegistered) {
    return 'verified';
  }

  // Otherwise, not accepted (not registered)
  return 'not_accepted';
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

      // Set selected to match catalog's selected
      if (catalog.selectedDocumentId) {
        setSelectedId(catalog.selectedDocumentId);
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

  // Convert real documents to IDSelectorDocument format
  const documents: IDSelectorDocument[] = documentCatalog.documents.map(
    metadata => {
      const docData = allDocuments[metadata.id];
      const isSelected = metadata.id === documentCatalog.selectedDocumentId;

      return {
        id: metadata.id,
        name: getDocumentDisplayName(metadata),
        state: determineDocumentState(metadata, docData?.data, isSelected),
      };
    },
  );

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

          {documents.length === 0 ? (
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
