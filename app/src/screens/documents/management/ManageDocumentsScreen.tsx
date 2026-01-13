// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Eraser, HousePlus } from '@tamagui/lucide-icons';

import type {
  DocumentCatalog,
  DocumentMetadata,
} from '@selfxyz/common/utils/types';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  ButtonsContainer,
  PrimaryButton,
  SecondaryButton,
} from '@selfxyz/mobile-sdk-alpha/components';
import { DocumentEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  borderColor,
  textBlack,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { impactLight } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { extraYPadding } from '@/utils/styleUtils';

const PassportDataSelector = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const {
    loadDocumentCatalog,
    getAllDocuments,
    deleteDocument,
    setSelectedDocument,
  } = usePassport();
  const [documentCatalog, setDocumentCatalog] = useState<DocumentCatalog>({
    documents: [],
  });
  const [_allDocuments, setAllDocuments] = useState<
    Record<string, { metadata: DocumentMetadata }>
  >({});
  const [loading, setLoading] = useState(true);

  const loadPassportDataInfo = useCallback(async () => {
    setLoading(true);
    const catalog = await loadDocumentCatalog();
    const docs = await getAllDocuments();
    setDocumentCatalog(catalog);
    setAllDocuments(docs);
    selfClient.trackEvent(DocumentEvents.DOCUMENTS_FETCHED, {
      count: catalog.documents.length,
    });
    if (catalog.documents.length === 0) {
      selfClient.trackEvent(DocumentEvents.NO_DOCUMENTS_FOUND);
    }
    setLoading(false);
  }, [
    selfClient,
    loadDocumentCatalog,
    getAllDocuments,
    setDocumentCatalog,
    setAllDocuments,
  ]);

  useEffect(() => {
    loadPassportDataInfo();
  }, [loadPassportDataInfo]);

  const handleDocumentSelection = async (
    documentId: string,
    isRegistered: boolean | undefined,
  ) => {
    if (!isRegistered) {
      Alert.alert(
        'Document not registered',
        'This document cannot be selected as active, because it is not registered. Click the add button next to it to register it first.',
        [{ text: 'OK', style: 'cancel' }],
      );

      return;
    }

    await setSelectedDocument(documentId);
    // Reload to update UI without loading state for quick operations
    const catalog = await loadDocumentCatalog();
    const docs = await getAllDocuments();
    setDocumentCatalog(catalog);
    setAllDocuments(docs);
    selfClient.trackEvent(DocumentEvents.DOCUMENT_SELECTED);
  };

  const handleDeleteSpecific = async (documentId: string) => {
    setLoading(true);
    await deleteDocument(documentId);
    selfClient.trackEvent(DocumentEvents.DOCUMENT_DELETED);
    await loadPassportDataInfo();
  };

  const handleRegisterDocument = async (documentId: string) => {
    try {
      await setSelectedDocument(documentId);
      navigation.navigate('ConfirmBelonging', {});
    } catch {
      Alert.alert(
        'Registration Error',
        'Failed to prepare document for registration. Please try again.',
        [{ text: 'OK', style: 'cancel' }],
      );
    }
  };

  const handleDeleteButtonPress = (
    documentId: string,
    isRegistered: boolean | undefined,
  ) => {
    const message = isRegistered
      ? 'Are you sure you want to delete this document?\n\nThis document is already linked to your identity in Self Protocol and cannot be linked by another person.'
      : 'Are you sure you want to delete this document?';

    Alert.alert('⚠️ Delete Document ⚠️', message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await handleDeleteSpecific(documentId);
        },
      },
    ]);
  };

  const getDisplayName = (documentType: string): string => {
    switch (documentType) {
      case 'passport':
        return 'Passport';
      case 'mock_passport':
        return 'Mock Passport';
      case 'id_card':
        return 'ID Card';
      case 'mock_id_card':
        return 'Mock ID Card';
      case 'aadhaar':
        return 'Aadhaar';
      case 'mock_aadhaar':
        return 'Mock Aadhaar';
      default:
        return documentType;
    }
  };

  const getDocumentInfo = (metadata: DocumentMetadata): string => {
    const countryCode =
      extractCountryFromData(metadata.data, metadata.documentCategory) ||
      'Unknown';
    return countryCode;
  };

  const extractCountryFromData = (
    data: string,
    documentCategory: string,
  ): string | null => {
    if (!data) return null;
    try {
      if (documentCategory === 'passport' || documentCategory === 'id_card') {
        if (data.length >= 5) {
          const countryCode = data.substring(2, 5); // Extract positions 2-4 from MRZ
          return countryCode;
        }
      } else if (documentCategory === 'aadhaar') {
        return 'IND';
      }
      return null;
    } catch {
      return null;
    }
  };

  const getDocumentBackgroundColor = (
    isSelected: boolean,
    isRegistered: boolean | undefined,
  ): string => {
    if (!isRegistered) {
      return '#ffebee'; // Light red for unregistered documents
    }
    return isSelected ? '$gray2' : 'white';
  };

  if (loading) {
    return (
      <YStack gap="$3" alignItems="center" padding="$4">
        <Text
          color={textBlack}
          fontWeight="bold"
          fontSize="$5"
          textAlign="center"
        >
          Available Documents
        </Text>
        <YStack gap="$3" alignItems="center" paddingVertical="$6">
          <Spinner size="large" />
          <Text color={textBlack} fontSize="$4" opacity={0.7}>
            Loading documents...
          </Text>
        </YStack>
      </YStack>
    );
  }

  if (documentCatalog.documents.length === 0) {
    return (
      <YStack gap="$2" alignItems="center">
        <Text
          color={textBlack}
          fontWeight="bold"
          fontSize="$5"
          textAlign="center"
          marginBottom="$3"
        >
          Available Documents
        </Text>
        <Text color={textBlack} fontSize="$4">
          No documents found
        </Text>
      </YStack>
    );
  }

  const hasUnregisteredDocuments = documentCatalog.documents.some(
    doc => !doc.isRegistered,
  );

  return (
    <YStack gap="$3" width="100%">
      <Text
        color={textBlack}
        fontWeight="bold"
        fontSize="$5"
        textAlign="center"
      >
        Available Documents
      </Text>
      {hasUnregisteredDocuments && (
        <YStack
          padding="$3"
          backgroundColor="#fff3cd"
          borderRadius="$3"
          borderWidth={1}
          borderColor="#ffc107"
        >
          <Text color="#856404" fontSize="$3" textAlign="center">
            ⚠️ We've detected some documents that are not registered. In order
            to use them, you'll have to register them first by clicking the plus
            icon next to them.
          </Text>
        </YStack>
      )}
      {documentCatalog.documents.map((metadata: DocumentMetadata) => (
        <YStack
          key={metadata.id}
          padding="$3"
          borderWidth={1}
          borderColor={
            documentCatalog.selectedDocumentId === metadata.id
              ? textBlack
              : borderColor
          }
          borderRadius="$3"
          backgroundColor={getDocumentBackgroundColor(
            documentCatalog.selectedDocumentId === metadata.id,
            metadata.isRegistered,
          )}
          onPress={() =>
            handleDocumentSelection(metadata.id, metadata.isRegistered)
          }
          pressStyle={{ opacity: 0.8 }}
        >
          <XStack
            alignItems="center"
            justifyContent="space-between"
            marginBottom="$2"
          >
            <XStack alignItems="center" gap="$3" flex={1}>
              <Button
                size="$2"
                circular
                backgroundColor={
                  documentCatalog.selectedDocumentId === metadata.id
                    ? textBlack
                    : 'white'
                }
                borderColor={textBlack}
                borderWidth={1}
                onPress={() =>
                  handleDocumentSelection(metadata.id, metadata.isRegistered)
                }
              >
                {documentCatalog.selectedDocumentId === metadata.id && (
                  <Check size={12} color="white" />
                )}
              </Button>
              <YStack flex={1}>
                <Text color={textBlack} fontWeight="bold" fontSize="$4">
                  {getDisplayName(metadata.documentType)}
                </Text>
                <Text color={textBlack} fontSize="$3" opacity={0.7}>
                  {getDocumentInfo(metadata)}
                </Text>
              </YStack>
            </XStack>
            <XStack gap="$3">
              {metadata.isRegistered !== true && (
                <Button
                  backgroundColor="white"
                  justifyContent="center"
                  borderColor={borderColor}
                  borderWidth={1}
                  size="$3"
                  onPress={e => {
                    e.stopPropagation();
                    handleRegisterDocument(metadata.id);
                  }}
                >
                  <HousePlus color={textBlack} size={16} />
                </Button>
              )}
              <Button
                backgroundColor="white"
                justifyContent="center"
                borderColor={borderColor}
                borderWidth={1}
                size="$3"
                onPress={e => {
                  e.stopPropagation();
                  handleDeleteButtonPress(metadata.id, metadata.isRegistered);
                }}
              >
                <Eraser color={textBlack} size={16} />
              </Button>
            </XStack>
          </XStack>
        </YStack>
      ))}
    </YStack>
  );
};

const ManageDocumentsScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { bottom } = useSafeAreaInsets();
  const { trackEvent } = useSelfClient();

  useEffect(() => {
    trackEvent(DocumentEvents.MANAGE_SCREEN_OPENED);
  }, [trackEvent]);

  const handleAddDocument = () => {
    impactLight();
    trackEvent(DocumentEvents.ADD_NEW_SCAN_SELECTED);
    navigation.navigate('CountryPicker');
  };

  const handleGenerateMock = () => {
    impactLight();
    trackEvent(DocumentEvents.ADD_NEW_MOCK_SELECTED);
    navigation.navigate('CreateMock');
  };

  return (
    <YStack
      flex={1}
      backgroundColor={white}
      paddingHorizontal="$4"
      paddingBottom={bottom + extraYPadding}
    >
      <YStack gap="$6" paddingVertical="$4" flex={1}>
        <ScrollView showsVerticalScrollIndicator={false} flex={1}>
          <PassportDataSelector />
        </ScrollView>

        <YStack gap="$3" marginTop="$4">
          <ButtonsContainer>
            <PrimaryButton onPress={handleAddDocument}>
              Add New Document
            </PrimaryButton>
            <SecondaryButton onPress={handleGenerateMock}>
              Generate Mock Document
            </SecondaryButton>
          </ButtonsContainer>
        </YStack>
      </YStack>
    </YStack>
  );
};

export default ManageDocumentsScreen;
