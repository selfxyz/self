// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import { Dimensions, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScrollView, Text, View, XStack, YStack } from 'tamagui';
import {
  useFocusEffect,
  useNavigation,
  usePreventRemove,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common/utils/types';
import type { DocumentMetadata } from '@selfxyz/mobile-sdk-alpha';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { DocumentEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import IdCardLayout from '@/components/homeScreen/idCard';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import useConnectionModal from '@/hooks/useConnectionModal';
import LogoInversed from '@/images/logo_inversed.svg';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import useUserStore from '@/stores/userStore';
import { black, slate50, slate300, slate500 } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { registerModalCallbacks } from '@/utils/modalCallbackRegistry';
import {
  hasUserAnIdentityDocumentRegistered,
  hasUserDoneThePointsDisclosure,
  pointsSelfApp,
} from '@/utils/points';

const UnverifiedHumanImage = require('@/images/unverified_human.png');

const HomeScreen: React.FC = () => {
  const selfClient = useSelfClient();
  useConnectionModal();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  const [selfPoints, setSelfPoints] = useState(312);

  // Calculate card dimensions exactly like IdCardLayout does
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth * 0.95 - 16; // 95% of screen width minus horizontal padding

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const catalog = await loadDocumentCatalog();
      const docs = await getAllDocuments();

      setDocumentCatalog(catalog);
      setAllDocuments(docs);
    } catch (error) {
      console.warn('Failed to load documents:', error);
    }
    setLoading(false);
  }, [loadDocumentCatalog, getAllDocuments]);

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

  const navigateToPointsProof = useCallback(async () => {
    const selfApp = await pointsSelfApp();
    selfClient.getSelfAppState().setSelfApp(selfApp);

    // Use setTimeout to ensure modal dismisses before navigating
    setTimeout(() => {
      navigation.navigate('Prove');
    }, 100);
  }, [selfClient, navigation]);

  const onEarnPointsPress = useCallback(async () => {
    const hasUserAnIdentityDocumentRegistered_result =
      await hasUserAnIdentityDocumentRegistered();
    if (!hasUserAnIdentityDocumentRegistered_result) {
      // Show modal prompting user to register an identity document first
      const callbackId = registerModalCallbacks({
        onButtonPress: () => {
          // Use setTimeout to ensure modal dismisses before navigating
          setTimeout(() => {
            navigation.navigate('DocumentOnboarding');
          }, 100);
        },
        onModalDismiss: () => {
          // No need to navigate, user is already on Home
        },
      });

      navigation.navigate('Modal', {
        titleText: 'Identity Verification Required',
        bodyText:
          'To access Self Points, you need to register an identity document with Self first. This helps us verify your identity and keep your points secure.',
        buttonText: 'Verify Identity',
        secondaryButtonText: 'Not Now',
        callbackId,
      });
    } else {
      const hasUserDoneThePointsDisclosure_result =
        await hasUserDoneThePointsDisclosure();
      if (!hasUserDoneThePointsDisclosure_result) {
        const callbackId = registerModalCallbacks({
          onButtonPress: () => {
            navigateToPointsProof();
          },
          onModalDismiss: () => {
            // No need to navigate, user is already on Home
          },
        });
        navigation.navigate('Modal', {
          titleText: 'Points Disclosure Required',
          bodyText:
            'To access Self Points, you need to complete the points disclosure first. This helps us verify your identity and keep your points secure.',
          buttonText: 'Complete Points Disclosure',
          secondaryButtonText: 'Not Now',
          callbackId,
        });
      } else {
        navigation.navigate('Points');
      }
    }
  }, [navigation, navigateToPointsProof, selfClient]);

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
    <YStack backgroundColor={'#F8FAFC'} flex={1} alignItems="center">
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
        {documentCatalog.documents.length === 0 ? (
          <Pressable
            onPress={() => {
              navigation.navigate('DocumentOnboarding');
            }}
          >
            <View
              width={cardWidth}
              borderRadius={16}
              overflow="hidden"
              alignSelf="center"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Image
                source={UnverifiedHumanImage}
                style={{ width: cardWidth, height: cardWidth * (418 / 640) }}
                resizeMode="cover"
              />
            </View>
          </Pressable>
        ) : (
          documentCatalog.documents.map((metadata: DocumentMetadata) => {
            const documentData = allDocuments[metadata.id];
            const isSelected =
              documentCatalog.selectedDocumentId === metadata.id;

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
          })
        )}
      </ScrollView>
      <YStack
        elevation={8}
        backgroundColor="white"
        width="100%"
        height={230}
        paddingTop={30}
        paddingHorizontal={20}
        paddingBottom={bottom + extraYPadding + 40}
        borderTopLeftRadius={18}
        borderTopRightRadius={18}
        style={{
          // Matches: box-shadow: 0 -6px 14px 0 rgba(0, 0, 0, 0.05);
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 8,
        }}
      >
        <XStack marginBottom={32} gap={22}>
          <View
            width={68}
            height={68}
            borderRadius={12}
            borderWidth={1}
            borderColor={slate300}
            alignItems="center"
            justifyContent="center"
          >
            <LogoInversed width={33} height={33} />
          </View>
          <YStack gap={4}>
            <Text
              color={black}
              fontFamily="DIN OT"
              fontSize={20}
              fontStyle="normal"
              fontWeight="500"
              lineHeight={22}
              textTransform="uppercase"
            >
              {`${selfPoints} SELF POINTS`}
            </Text>
            <Text
              color={black}
              width="60%"
              fontFamily="DIN OT"
              fontSize={16}
              fontStyle="normal"
              fontWeight="500"
              lineHeight="normal"
            >
              Earn points by referring friends, disclosing proof requests, and
              more.
            </Text>
          </YStack>
        </XStack>
        <Button
          backgroundColor="white"
          paddingHorizontal={22}
          paddingVertical={24}
          borderRadius={5}
          borderWidth={1}
          borderColor={slate300}
          onPress={onEarnPointsPress}
        >
          <Text
            color="#2563EB"
            textAlign="center"
            fontFamily="DIN OT"
            fontSize={18}
            height={22}
          >
            Earn points
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
};

export default HomeScreen;
