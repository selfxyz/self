// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Image, Text, View, XStack, YStack } from 'tamagui';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { Eye, EyeOff } from '@tamagui/lucide-icons';

import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils/appType';
import { formatEndpoint } from '@selfxyz/common/utils/scope';
import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { useSelfAppStore } from '@selfxyz/mobile-sdk-alpha/stores';

import miscAnimation from '@/assets/animations/loading/misc.json';
import { HeldPrimaryButtonProveScreen } from '@/components/buttons/HeldPrimaryButtonProveScreen';
import Disclosures from '@/components/Disclosures';
import { BodyText } from '@/components/typography/BodyText';
import { Caption } from '@/components/typography/Caption';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import {
  setDefaultDocumentTypeIfNeeded,
  usePassport,
} from '@/providers/passportDataProvider';
import { ProofStatus } from '@/stores/proof-types';
import { useProofHistoryStore } from '@/stores/proofHistoryStore';
import { black, slate300, white } from '@/utils/colors';
import { formatUserId } from '@/utils/formatUserId';
import { buttonTap } from '@/utils/haptic';
import { useProvingStore } from '@/utils/proving/provingMachine';

const ProveScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;
  const { navigate } = useNavigation();
  const isFocused = useIsFocused();
  const selectedApp = useSelfAppStore(state => state.selfApp);
  const selectedAppRef = useRef<typeof selectedApp>(null);

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollViewContentHeight, setScrollViewContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const isContentShorterThanScrollView = useMemo(
    () => scrollViewContentHeight <= scrollViewHeight,
    [scrollViewContentHeight, scrollViewHeight],
  );
  const provingStore = useProvingStore();
  const currentState = useProvingStore(state => state.currentState);
  const isReadyToProve = currentState === 'ready_to_prove';

  const { addProofHistory } = useProofHistoryStore();
  const { loadDocumentCatalog } = usePassport();

  useEffect(() => {
    const addHistory = async () => {
      if (provingStore.uuid && selectedApp) {
        const catalog = await loadDocumentCatalog();
        const selectedDocumentId = catalog.selectedDocumentId;

        addProofHistory({
          appName: selectedApp.appName,
          sessionId: provingStore.uuid!,
          userId: selectedApp.userId,
          userIdType: selectedApp.userIdType,
          endpointType: selectedApp.endpointType,
          status: ProofStatus.PENDING,
          logoBase64: selectedApp.logoBase64,
          disclosures: JSON.stringify(selectedApp.disclosures),
          documentId: selectedDocumentId || '', // Fallback to empty if none selected
        });
      }
    };
    addHistory();
  }, [addProofHistory, provingStore.uuid, selectedApp, loadDocumentCatalog]);

  useEffect(() => {
    if (isContentShorterThanScrollView) {
      setHasScrolledToBottom(true);
    } else {
      setHasScrolledToBottom(false);
    }
  }, [isContentShorterThanScrollView]);

  useEffect(() => {
    if (!isFocused || !selectedApp) {
      return;
    }

    setDefaultDocumentTypeIfNeeded();

    if (selectedAppRef.current?.sessionId !== selectedApp.sessionId) {
      provingStore.init(selfClient, 'disclose');
    }
    selectedAppRef.current = selectedApp;
  }, [selectedApp, isFocused, provingStore, selfClient]);

  const disclosureOptions = useMemo(() => {
    return (selectedApp?.disclosures as SelfAppDisclosureConfig) || [];
  }, [selectedApp?.disclosures]);

  // Format the logo source based on whether it's a URL or base64 string
  const logoSource = useMemo(() => {
    if (!selectedApp?.logoBase64) {
      return null;
    }

    // Check if the logo is already a URL
    if (
      selectedApp.logoBase64.startsWith('http://') ||
      selectedApp.logoBase64.startsWith('https://')
    ) {
      return { uri: selectedApp.logoBase64 };
    }

    // Otherwise handle as base64 as before
    const base64String = selectedApp.logoBase64.startsWith('data:image')
      ? selectedApp.logoBase64
      : `data:image/png;base64,${selectedApp.logoBase64}`;
    return { uri: base64String };
  }, [selectedApp?.logoBase64]);

  const url = useMemo(() => {
    if (!selectedApp?.endpoint) {
      return null;
    }
    return formatEndpoint(selectedApp.endpoint);
  }, [selectedApp?.endpoint]);

  const formattedUserId = useMemo(
    () => formatUserId(selectedApp?.userId, selectedApp?.userIdType),
    [selectedApp?.userId, selectedApp?.userIdType],
  );

  function onVerify() {
    provingStore.setUserConfirmed(selfClient);
    buttonTap();
    trackEvent(ProofEvents.PROOF_VERIFY_CONFIRMATION_ACCEPTED, {
      appName: selectedApp?.appName,
      sessionId: provingStore.uuid,
      endpointType: selectedApp?.endpointType,
      userIdType: selectedApp?.userIdType,
    });
    setTimeout(() => {
      navigate('ProofRequestStatus');
    }, 100);
  }

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (hasScrolledToBottom || isContentShorterThanScrollView) {
        return;
      }
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      const paddingToBottom = 10;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;
      if (isCloseToBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true);
        buttonTap();
        trackEvent(ProofEvents.PROOF_DISCLOSURES_SCROLLED, {
          appName: selectedApp?.appName,
          sessionId: provingStore.uuid,
        });
      }
    },
    [
      hasScrolledToBottom,
      isContentShorterThanScrollView,
      selectedApp,
      provingStore.uuid,
      trackEvent,
    ],
  );

  const handleContentSizeChange = useCallback(
    (contentWidth: number, contentHeight: number) => {
      setScrollViewContentHeight(contentHeight);
    },
    [],
  );

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    setScrollViewHeight(event.nativeEvent.layout.height);
  }, []);

  const handleAddressToggle = useCallback(() => {
    if (selectedApp?.userIdType === 'hex') {
      setShowFullAddress(!showFullAddress);
      buttonTap();
    }
  }, [selectedApp?.userIdType, showFullAddress]);

  return (
    <ExpandableBottomLayout.Layout flex={1} backgroundColor={black}>
      <ExpandableBottomLayout.TopSection backgroundColor={black}>
        <YStack alignItems="center">
          {!selectedApp?.sessionId ? (
            <LottieView
              source={miscAnimation}
              autoPlay
              loop
              resizeMode="cover"
              cacheComposition={true}
              renderMode="HARDWARE"
              style={styles.animation}
              speed={1}
              progress={0}
            />
          ) : (
            <YStack alignItems="center" justifyContent="center">
              {logoSource && (
                <Image
                  marginBottom={20}
                  source={logoSource}
                  width={100}
                  height={100}
                  objectFit="contain"
                />
              )}
              <BodyText fontSize={12} color={slate300} marginBottom={20}>
                {url}
              </BodyText>
              <BodyText fontSize={24} color={slate300} textAlign="center">
                <Text color={white}>{selectedApp.appName}</Text> is requesting
                that you prove the following information:
              </BodyText>
            </YStack>
          )}
        </YStack>
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        paddingBottom={20}
        backgroundColor={white}
        maxHeight={'55%'}
      >
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleScrollViewLayout}
        >
          <Disclosures disclosures={disclosureOptions} />

          {/* Display connected wallet or UUID */}
          {formattedUserId && (
            <View marginTop={20} paddingHorizontal={20}>
              <BodyText
                fontSize={16}
                color={black}
                fontWeight="600"
                marginBottom={10}
              >
                {selectedApp?.userIdType === 'hex'
                  ? 'Connected Wallet'
                  : 'Connected ID'}
                :
              </BodyText>
              <TouchableOpacity
                onPress={handleAddressToggle}
                activeOpacity={selectedApp?.userIdType === 'hex' ? 0.7 : 1}
                style={{ minHeight: 44 }}
              >
                <View
                  backgroundColor={slate300}
                  padding={15}
                  borderRadius={8}
                  marginBottom={10}
                >
                  <XStack alignItems="center" justifyContent="space-between">
                    <View
                      flex={1}
                      marginRight={selectedApp?.userIdType === 'hex' ? 12 : 0}
                    >
                      <BodyText
                        fontSize={14}
                        color={black}
                        lineHeight={20}
                        fontFamily={
                          showFullAddress && selectedApp?.userIdType === 'hex'
                            ? 'monospace'
                            : 'normal'
                        }
                        flexWrap={showFullAddress ? 'wrap' : 'nowrap'}
                      >
                        {selectedApp?.userIdType === 'hex' && showFullAddress
                          ? selectedApp.userId
                          : formattedUserId}
                      </BodyText>
                    </View>
                    {selectedApp?.userIdType === 'hex' && (
                      <View alignItems="center" justifyContent="center">
                        {showFullAddress ? (
                          <EyeOff size={16} color={black} />
                        ) : (
                          <Eye size={16} color={black} />
                        )}
                      </View>
                    )}
                  </XStack>
                  {selectedApp?.userIdType === 'hex' && (
                    <BodyText
                      fontSize={12}
                      color={black}
                      opacity={0.6}
                      marginTop={4}
                    >
                      {showFullAddress
                        ? 'Tap to hide address'
                        : 'Tap to show full address'}
                    </BodyText>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Display userDefinedData if it exists */}
          {selectedApp?.userDefinedData && (
            <View marginTop={20} paddingHorizontal={20}>
              <BodyText
                fontSize={16}
                color={black}
                fontWeight="600"
                marginBottom={10}
              >
                Additional Information:
              </BodyText>
              <View
                backgroundColor={slate300}
                padding={15}
                borderRadius={8}
                marginBottom={10}
              >
                <BodyText fontSize={14} color={black} lineHeight={20}>
                  {selectedApp.userDefinedData}
                </BodyText>
              </View>
            </View>
          )}

          <View marginTop={20}>
            <Caption
              textAlign="center"
              size="small"
              marginBottom={20}
              marginTop={10}
              borderRadius={4}
              paddingBottom={20}
            >
              Self will confirm that these details are accurate and none of your
              confidential info will be revealed to {selectedApp?.appName}
            </Caption>
          </View>
        </ScrollView>
        <HeldPrimaryButtonProveScreen
          onVerify={onVerify}
          selectedAppSessionId={selectedApp?.sessionId}
          hasScrolledToBottom={hasScrolledToBottom}
          isReadyToProve={isReadyToProve}
        />
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default ProveScreen;

const styles = StyleSheet.create({
  animation: {
    top: 0,
    width: 200,
    height: 200,
    transform: [{ scale: 2 }, { translateY: -20 }],
  },
});
