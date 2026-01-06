// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { Switch } from 'react-native';
import { Button, ScrollView, Text, XStack, YStack } from 'tamagui';
import { useFocusEffect } from '@react-navigation/native';

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
import { usePassport } from '@/providers/passportDataProvider';
import {
  checkDocumentExpiration,
  getDocumentAttributes,
} from '@/utils/documentAttributes';

// Mock documents representing all 4 states
const MOCK_DOCUMENTS: IDSelectorDocument[] = [
  {
    id: 'mock-eu-id',
    name: 'EU ID',
    state: 'active',
  },
  {
    id: 'mock-french-passport',
    name: 'French Passport',
    state: 'verified',
  },
  {
    id: 'mock-developer-passport',
    name: 'Developer Passport',
    state: 'not_accepted',
  },
  {
    id: 'mock-aadhaar',
    name: 'Aadhaar ID',
    state: 'expired',
  },
];

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
  const { getAllDocuments, loadDocumentCatalog, setSelectedDocument } =
    usePassport();
  const bottomPadding = useSafeBottomPadding(20);

  // Mode toggle
  const [useMockData, setUseMockData] = useState(true);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(
    MOCK_DOCUMENTS[0].id,
  );

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

  // Load real documents on focus if in real mode
  useFocusEffect(
    useCallback(() => {
      if (!useMockData) {
        loadRealDocuments();
      }
    }, [useMockData, loadRealDocuments]),
  );

  // Switch to mock data when toggled
  useEffect(() => {
    if (useMockData) {
      setSelectedId(MOCK_DOCUMENTS[0].id);
    } else {
      loadRealDocuments();
    }
  }, [useMockData, loadRealDocuments]);

  // Convert real documents to IDSelectorDocument format
  const realDocumentsForSheet: IDSelectorDocument[] =
    documentCatalog.documents.map(metadata => {
      const docData = allDocuments[metadata.id];
      const isSelected = metadata.id === documentCatalog.selectedDocumentId;

      return {
        id: metadata.id,
        name: getDocumentDisplayName(metadata),
        state: determineDocumentState(metadata, docData?.data, isSelected),
      };
    });

  const documents = useMockData ? MOCK_DOCUMENTS : realDocumentsForSheet;

  const selectedDocument = documents.find(doc => doc.id === selectedId);
  const selectedName = selectedDocument?.name || 'None';

  const handleSelect = (documentId: string) => {
    setSelectedId(documentId);
  };

  const handleApprove = async () => {
    setSheetOpen(false);

    // If in real mode, actually persist the selection
    if (!useMockData && selectedId) {
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
    if (!useMockData && documentCatalog.selectedDocumentId) {
      setSelectedId(documentCatalog.selectedDocumentId);
    } else if (useMockData) {
      setSelectedId(MOCK_DOCUMENTS[0].id);
    }
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

          {/* Mode Toggle */}
          <YStack
            backgroundColor={white}
            borderRadius={12}
            padding={16}
            borderWidth={1}
            borderColor={slate300}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <YStack gap={4}>
                <Text
                  fontFamily={dinot}
                  fontSize={16}
                  fontWeight="500"
                  color={black}
                >
                  {useMockData ? 'Mock Data Mode' : 'Real Documents Mode'}
                </Text>
                <Text fontFamily={dinot} fontSize={14} color={slate500}>
                  {useMockData
                    ? 'Using hardcoded test data'
                    : 'Using documents from storage'}
                </Text>
              </YStack>
              <Switch
                value={!useMockData}
                onValueChange={value => setUseMockData(!value)}
                trackColor={{ false: slate300, true: blue600 }}
                thumbColor={white}
              />
            </XStack>
          </YStack>

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
            paddingVertical={16}
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
