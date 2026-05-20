// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, XStack, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common/utils/types';
import {
  getEligiblePerksForIdType,
  getPerkRecordsForIdType,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { EligiblePerksCard } from '@selfxyz/mobile-sdk-alpha/components';
import { IDDataEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
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
import { idTypeForDocumentCategory } from '@/utils/documentUtils';

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
  const { trackEvent } = useSelfClient();

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

  const idType = useMemo(
    () =>
      document && !document.mock
        ? idTypeForDocumentCategory(document.documentCategory)
        : null,
    [document],
  );

  const perkRecords = useMemo(
    () => (idType ? getPerkRecordsForIdType(idType) : []),
    [idType],
  );

  const perks = useMemo(
    () => (idType ? getEligiblePerksForIdType(idType) : []),
    [idType],
  );

  const handlePerksView = (perkIds: string[]) => {
    trackEvent(IDDataEvents.PERKS_VIEWED, {
      id_type: idType,
      perk_count: perkIds.length,
      perk_ids: perkIds,
    });
  };

  const handlePerkPress = async (perkId: string) => {
    const record = perkRecords.find(perk => perk.id === perkId);
    trackEvent(IDDataEvents.PERK_TAPPED, {
      id_type: idType,
      perk_id: perkId,
      has_outlink: Boolean(record?.outlinkUrl),
    });
    if (!record?.outlinkUrl) {
      return;
    }
    try {
      await Linking.openURL(record.outlinkUrl);
    } catch {
      trackEvent(IDDataEvents.PERK_OUTLINK_OPEN_FAILED, {
        id_type: idType,
        perk_id: perkId,
      });
    }
  };

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

  const FLOATING_BUTTON_HEIGHT = 56;
  const FLOATING_BUTTON_GAP = 16;
  const floatingButtonClearance =
    bottom + 20 + FLOATING_BUTTON_HEIGHT + FLOATING_BUTTON_GAP;

  const ListHeader = (
    <YStack padding={20} paddingBottom={0}>
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
      {perks.length > 0 && isHidden ? (
        <YStack marginTop={'$4'}>
          <EligiblePerksCard
            perks={perks}
            onView={handlePerksView}
            onPerkPress={handlePerkPress}
          />
        </YStack>
      ) : null}
    </YStack>
  );

  return (
    <YStack flex={1} backgroundColor={slate50}>
      <ProofHistoryList
        documentId={documentId}
        ListHeaderComponent={ListHeader}
        contentBottomPadding={floatingButtonClearance}
      />
      <LinearGradient
        colors={['transparent', slate50]}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
        }}
        pointerEvents="none"
      />
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
    </YStack>
  );
};

export default IdDetailsScreen;
