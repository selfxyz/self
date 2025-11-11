// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Pressable } from 'react-native';
import { Button, ScrollView, Text, View, XStack, YStack } from 'tamagui';
import {
  useFocusEffect,
  useIsFocused,
  useNavigation,
  usePreventRemove,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { DocumentCatalog, IDDocument } from '@selfxyz/common/utils/types';
import type { DocumentMetadata } from '@selfxyz/mobile-sdk-alpha';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  DocumentEvents,
  PointEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks/useSafeBottomPadding';

import IdCardLayout from '@/components/homeScreen/idCard';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import useConnectionModal from '@/hooks/useConnectionModal';
import { useEarnPointsFlow } from '@/hooks/useEarnPointsFlow';
import { usePoints } from '@/hooks/usePoints';
import { useReferralConfirmation } from '@/hooks/useReferralConfirmation';
import { useTestReferralFlow } from '@/hooks/useTestReferralFlow';
import LogoInversed from '@/images/logo_inversed.svg';
import UnverifiedHumanImage from '@/images/unverified_human.png';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import useUserStore from '@/stores/userStore';
import { black, slate50, slate300 } from '@/utils/colors';
import { dinot } from '@/utils/fonts';

const HomeScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const referrer = useUserStore(state => state.deepLinkReferrer);
  const hasReferrer = referrer !== undefined;
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

  const { amount: selfPoints } = usePoints();

  // Calculate card dimensions exactly like IdCardLayout does
  const { width: screenWidth } = Dimensions.get('window');
  const cardWidth = screenWidth * 0.95 - 16; // 95% of screen width minus horizontal padding

  // DEV MODE: Test referral flow hook (only show alert when screen is focused)
  const isFocused = useIsFocused();
  const route = useRoute();
  const routeParams = route.params as
    | { testReferralFlow?: boolean }
    | undefined;
  const [shouldTriggerReferralTest, setShouldTriggerReferralTest] =
    useState(false);

  // Watch for testReferralFlow param and trigger once
  useEffect(() => {
    if (routeParams?.testReferralFlow && isFocused) {
      setShouldTriggerReferralTest(true);
      // Clear the param
      navigation.setParams({ testReferralFlow: undefined } as never);
    }
  }, [routeParams?.testReferralFlow, isFocused, navigation]);

  useTestReferralFlow(shouldTriggerReferralTest);

  // Reset trigger flag after hook processes it
  useEffect(() => {
    if (shouldTriggerReferralTest) {
      const timer = setTimeout(() => {
        setShouldTriggerReferralTest(false);
      }, 3500); // Slightly longer than the 3 second timer in the hook
      return () => clearTimeout(timer);
    }
  }, [shouldTriggerReferralTest]);

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

  // Calculate bottom padding to prevent button bleeding into system navigation
  const bottomPadding = useSafeBottomPadding(20);

  // Create a stable reference to avoid hook dependency issues
  const onEarnPointsPressRef = useRef<
    ((skipReferralFlow?: boolean) => Promise<void>) | null
  >(null);

  const { isReferralConfirmed } = useReferralConfirmation({
    hasReferrer,
    onConfirmed: () => {
      onEarnPointsPressRef.current?.(false);
    },
  });

  const { onEarnPointsPress } = useEarnPointsFlow({
    hasReferrer,
    isReferralConfirmed,
  });

  // Update the ref whenever onEarnPointsPress changes
  useEffect(() => {
    onEarnPointsPressRef.current = onEarnPointsPress;
  }, [onEarnPointsPress]);

  const handleDocumentPress = useCallback(
    (metadata: DocumentMetadata, documentData: IDDocument) => {
      selfClient.trackEvent(DocumentEvents.DOCUMENT_SELECTED, {
        document_type: documentData.documentType,
        document_category: documentData.documentCategory,
      });
      setIdDetailsDocumentId(metadata.id);
      navigation.navigate('IdDetails');
    },
    [selfClient, setIdDetailsDocumentId, navigation],
  );

  if (loading) {
    return (
      <YStack
        backgroundColor={slate50}
        flex={1}
        paddingHorizontal={20}
        paddingBottom={bottomPadding}
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
              borderRadius={8}
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
                onPress={() => handleDocumentPress(metadata, documentData.data)}
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
        paddingTop={20}
        paddingHorizontal={20}
        paddingBottom={bottomPadding}
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
              fontFamily={dinot}
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
              fontFamily={dinot}
              fontSize={16}
              fontStyle="normal"
              fontWeight="500"
              lineHeight={22}
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
          testID="earn-points-button"
          onPress={() => {
            selfClient.trackEvent(PointEvents.HOME_POINT_EARN_POINTS_OPENED);
            onEarnPointsPress(true);
          }}
        >
          <Text
            color="#2563EB"
            textAlign="center"
            fontFamily={dinot}
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
