// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import type { DocumentCategory } from '@selfxyz/common/utils/types';
import {
  loadSelectedDocument,
  SdkEvents,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  AbstractButton,
  Description,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { black, white } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import { setSelectedDocument } from '@/providers/passportDataProvider';
import { usePendingKycStore } from '@/stores/pendingKycStore';

const KYCVerifiedScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'KYCVerified'>>();
  const insets = useSafeAreaInsets();
  const selfClient = useSelfClient();
  const { pendingVerifications, removePendingVerification } =
    usePendingKycStore();
  const [isLoading, setIsLoading] = useState(false);

  const documentId = route.params?.documentId;

  const handleGenerateProof = async () => {
    // Prevent multiple concurrent proof generations
    if (isLoading) {
      return;
    }

    buttonTap();
    setIsLoading(true);

    try {
      if (!documentId) {
        console.error(
          '[KYCVerifiedScreen] No documentId provided in route params',
        );
        return;
      }

      console.log(
        '[KYCVerifiedScreen] Triggering proving for documentId:',
        documentId,
      );

      await setSelectedDocument(documentId);

      const selectedDocument = await loadSelectedDocument(selfClient);
      if (!selectedDocument) {
        console.error(
          '[KYCVerifiedScreen] No document found to trigger registration',
        );
        return;
      }

      const pendingVerification = pendingVerifications.find(
        v => v.documentId === documentId,
      );
      //TODO improvement: instead of removing it here, we could do it in provingMachine's final state(error/completed)
      //if we do that, the card will still be displayed in Homescreen as 'Pending' if user click back midway during provingMachine
      if (pendingVerification) {
        removePendingVerification(pendingVerification.userId);
      }

      const documentMetadata: {
        documentCategory?: DocumentCategory;
        signatureAlgorithm?: string;
        curveOrExponent?: string;
      } = {
        documentCategory: 'kyc' as const,
      };

      console.log('[KYCVerifiedScreen] Emitting DOCUMENT_OWNERSHIP_CONFIRMED');
      selfClient.emit(SdkEvents.DOCUMENT_OWNERSHIP_CONFIRMED, documentMetadata);
    } catch (err) {
      console.error('[KYCVerifiedScreen] Failed to trigger registration:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.spacer} />
      <YStack
        paddingHorizontal={24}
        justifyContent="center"
        alignItems="center"
        gap={12}
        marginBottom={64}
      >
        <Title style={styles.title}>Your ID has been verified</Title>
        <Description style={styles.description}>
          Next Self will generate a zk proof specifically for this device that
          you can use to proof your identity.
        </Description>
      </YStack>
      <YStack gap={12} paddingHorizontal={20} paddingBottom={24}>
        <AbstractButton
          bgColor={white}
          color={black}
          onPress={handleGenerateProof}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : 'Generate proof'}
        </AbstractButton>
      </YStack>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: black,
  },
  spacer: {
    flex: 1,
  },
  title: {
    color: white,
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 1,
  },
  description: {
    color: white,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 27,
  },
});

export default KYCVerifiedScreen;
