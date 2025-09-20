// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Text, YStack } from 'tamagui';
import {
  useFocusEffect,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';

import { PassportData } from '@selfxyz/common/types';
import { DocumentCatalog, IDDocument } from '@selfxyz/common/utils/types';
import { DocumentMetadata, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { DocumentEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import IdCardLayout from '@/components/homeScreen/idCard';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import useConnectionModal from '@/hooks/useConnectionModal';
import { usePassport } from '@/providers/passportDataProvider';
import useUserStore from '@/stores/userStore';
import { slate50 } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';

const HomeScreen: React.FC = () => {
  const selfClient = useSelfClient();
  useConnectionModal();
  const navigation = useNavigation();
  const { setIdDetailsDocumentId } = useUserStore();
  const { getAllDocuments, loadDocumentCatalog } = usePassport();
  const [isNewVersionAvailable, showAppUpdateModal, isModalDismissed] =
    useAppUpdates();
  const [documentCatalog, setDocumentCatalog] = useState<DocumentCatalog>({
    documents: [],
  });
  const [allDocuments, setAllDocuments] = useState<
    Record<string, { data: IDDocument; metadata: DocumentMetadata }>
  >({});
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await loadDocumentCatalog();
      const docs = await getAllDocuments();

      setDocumentCatalog(catalog);
      setAllDocuments(docs);

      if (catalog.documents.length === 0) {
        navigation.navigate('Launch' as never);
      }
    } catch (error) {
      console.warn('Failed to load documents:', error);
      navigation.navigate('Launch' as never);
    }
    setLoading(false);
  }, [loadDocumentCatalog, getAllDocuments, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments]),
  );

  useFocusEffect(() => {
    if (isNewVersionAvailable && !isModalDismissed) {
      showAppUpdateModal();
    }
  });

  // Prevents back navigation
  usePreventRemove(true, () => {});
  const { bottom } = useSafeAreaInsets();

  if (loading) {
    return (
      <YStack
        backgroundColor={slate50}
        flex={1}
        paddingHorizontal={20}
        paddingBottom={bottom + extraYPadding}
        justifyContent="center"
        alignItems="center"
      >
        <Text>Loading documents...</Text>
      </YStack>
    );
  }

  return (
    <YStack
      backgroundColor={'#F8FAFC'}
      flex={1}
      alignItems="center"
      paddingBottom={bottom + extraYPadding}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        flex={1}
        contentContainerStyle={{
          gap: 15,
          paddingVertical: 20,
          paddingHorizontal: 15, // Add horizontal padding for shadow space
          paddingBottom: 35, // Add extra bottom padding for shadow
        }}
      >
        {documentCatalog.documents.map((metadata: DocumentMetadata) => {
          const documentData = allDocuments[metadata.id];
          const isSelected = documentCatalog.selectedDocumentId === metadata.id;

          if (!documentData) {
            return null;
          }

          return (
            <Pressable
              key={metadata.id}
              onPress={() => {
                selfClient.trackEvent(DocumentEvents.DOCUMENT_SELECTED, {
                  document_type: documentData.data.documentType,
                  document_category: documentData.data.documentCategory,
                });
                setIdDetailsDocumentId(metadata.id);
                navigation.navigate('IdDetails');
              }}
            >
              <IdCardLayout
                idDocument={documentData.data}
                selected={isSelected}
                hidden={true}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </YStack>
  );
};

export default HomeScreen;
