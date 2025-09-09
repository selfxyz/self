// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScrollView, styled, Text, YStack } from 'tamagui';
import {
  useFocusEffect,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';

import { PassportData } from '@selfxyz/common/types';
import { DocumentCatalog } from '@selfxyz/common/utils/types';
import { DocumentMetadata, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { pressedStyle } from '@/components/buttons/pressedStyle';
import IdCardLayout from '@/components/homeScreen/idCard';
import { BodyText } from '@/components/typography/BodyText';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import useConnectionModal from '@/hooks/useConnectionModal';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import WarnIcon from '@/images/icons/warning.svg';
import { usePassport } from '@/providers/passportDataProvider';
import { useSettingStore } from '@/stores/settingStore';
import useUserStore from '@/stores/userStore';
import { neutral700, slate50, slate800, white } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';

const ScanButton = styled(Button, {
  borderRadius: 20,
  width: 90,
  height: 90,
  borderColor: neutral700,
  borderWidth: 1,
  backgroundColor: '#1D1D1D',
  alignItems: 'center',
  justifyContent: 'center',
});

const HomeScreen: React.FC = () => {
  const selfClient = useSelfClient();
  useConnectionModal();
  const navigation = useNavigation();
  const { setIdDetailsDocumentId } = useUserStore();
  const { getAllDocuments, loadDocumentCatalog, setSelectedDocument } =
    usePassport();
  const [isNewVersionAvailable, showAppUpdateModal, isModalDismissed] =
    useAppUpdates();
  const [documentCatalog, setDocumentCatalog] = useState<DocumentCatalog>({
    documents: [],
  });
  const [allDocuments, setAllDocuments] = useState<
    Record<string, { data: PassportData; metadata: DocumentMetadata }>
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

  const handleDocumentSelection = async (documentId: string) => {
    await setSelectedDocument(documentId);
    // Reload catalog to update selected state
    const updatedCatalog = await loadDocumentCatalog();
    setDocumentCatalog(updatedCatalog);
  };

  const goToQRCodeViewFinder = useHapticNavigation('QRCodeViewFinder');
  const onScanButtonPress = useCallback(() => {
    selfClient.trackEvent(ProofEvents.QR_SCAN_REQUESTED, {
      from: 'Home',
    });

    goToQRCodeViewFinder();
  }, [goToQRCodeViewFinder, selfClient]);

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

const pressStyle = {
  opacity: 1,
  backgroundColor: 'transparent',
  transform: [{ scale: 0.95 }],
} as const;

function PrivacyNote() {
  const { hasPrivacyNoteBeenDismissed } = useSettingStore();
  const onDisclaimerPress = useHapticNavigation('Disclaimer');

  if (hasPrivacyNoteBeenDismissed) {
    return null;
  }

  return (
    <Card onPress={onDisclaimerPress} pressStyle={pressedStyle}>
      <WarnIcon color={white} width={24} height={33} />
      <BodyText color={white} textAlign="center" fontSize={18}>
        A note on protecting your privacy
      </BodyText>
    </Card>
  );
}

export default HomeScreen;

const Card = styled(YStack, {
  width: '100%',

  flexGrow: 0,
  backgroundColor: slate800,
  borderRadius: 8,
  gap: 12,
  alignItems: 'center',
  padding: 20,
});
