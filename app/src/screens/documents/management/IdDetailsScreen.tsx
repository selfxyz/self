// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack, ZStack } from 'tamagui';
import { BlurView } from '@react-native-community/blur';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common/utils/types';
import {
  black,
  slate50,
  slate100,
  slate300,
  slate500,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import IdCardLayout from '@/components/homescreen/IdCard';
import { usePassport } from '@/providers/passportDataProvider';
import { ProofHistoryList } from '@/screens/home/ProofHistoryList';
import useUserStore from '@/stores/userStore';

const IdDetailsScreen: React.FC = () => {
  const { idDetailsDocumentId } = useUserStore();
  const documentId = idDetailsDocumentId;
  const { getAllDocuments, loadDocumentCatalog, setSelectedDocument } =
    usePassport();
  const [document, setDocument] = useState<IDDocument | null>(null);
  const [documentCatalog, setDocumentCatalog] = useState<DocumentCatalog>({
    documents: [],
  });
  const [isHidden, setIsHidden] = useState(true);
  const navigation = useNavigation();
  const { bottom } = useSafeAreaInsets();

  const [isFocused, setIsFocused] = useState(false);

  // Added to unmount BlurView when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      setIsFocused(true);
      return () => {
        setIsFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    const loadDocumentAndCatalog = async () => {
      const allDocs = await getAllDocuments();
      const catalog = await loadDocumentCatalog();
      const docEntry = Object.entries(allDocs).find(
        ([id]) => id === documentId,
      );
      setDocument(docEntry ? docEntry[1].data : null);
      setDocumentCatalog(catalog);
    };
    loadDocumentAndCatalog();
  }, [documentId, getAllDocuments, loadDocumentCatalog]);

  const isConnected = documentCatalog.selectedDocumentId === documentId;

  const handleConnectId = async () => {
    if (!isConnected) {
      await setSelectedDocument(documentId!);
      const updatedCatalog = await loadDocumentCatalog();
      setDocumentCatalog(updatedCatalog);
    }
  };

  if (!documentId) {
    return (
      <YStack
        flex={1}
        backgroundColor={slate50}
        justifyContent="center"
        alignItems="center"
        padding={20}
      >
        <Text>No document selected</Text>
      </YStack>
    );
  }

  if (!document) {
    return (
      <YStack
        flex={1}
        backgroundColor={slate50}
        justifyContent="center"
        alignItems="center"
        padding={20}
      >
        <Text>Loading...</Text>
      </YStack>
    );
  }

  const ListHeader = (
    <YStack padding={20}>
      <IdCardLayout idDocument={document} selected={true} hidden={isHidden} />
      <XStack marginTop={'$3'} justifyContent="flex-start" gap={'$4'}>
        <Button
          onPress={() => setIsHidden(!isHidden)}
          backgroundColor={white}
          color={'#2463EB'}
          borderColor={slate300}
          borderWidth={1}
          borderRadius={5}
          flex={1}
          height={'$5'}
          fontSize={16}
          fontWeight="bold"
        >
          {isHidden ? 'View ID Data' : 'Hide ID Data'}
        </Button>
        <Button
          onPress={() => navigation.navigate('ManageDocuments' as never)}
          backgroundColor={'#2463EB'}
          color={white}
          borderColor={'#2463EB'}
          borderWidth={1}
          borderRadius={5}
          flex={1}
          height={'$5'}
          fontSize={16}
          fontWeight="bold"
        >
          Manage ID
        </Button>
      </XStack>
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor={slate50}>
      {ListHeader}
      <ZStack flex={1}>
        <ProofHistoryList documentId={documentId} />
        {isFocused && (
          <BlurView
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
            }}
            blurType="light"
            blurAmount={4}
            reducedTransparencyFallbackColor={slate50}
            pointerEvents="none"
          />
        )}
        <YStack position="absolute" bottom={bottom + 20} left={20} right={20}>
          <Button
            backgroundColor={isConnected ? slate100 : white}
            color={isConnected ? slate500 : '#2463EB'}
            borderColor={isConnected ? slate300 : slate100}
            borderWidth={1}
            borderRadius={'$3'}
            height={'$5'}
            fontSize={17}
            elevation={4}
            shadowColor={black}
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            fontWeight="bold"
            opacity={isConnected ? 0.8 : 1}
            disabled={isConnected}
            onPress={handleConnectId}
          >
            {isConnected ? 'ID Connected' : 'Connect ID'}
          </Button>
        </YStack>
      </ZStack>
    </YStack>
  );
};

export default IdDetailsScreen;
