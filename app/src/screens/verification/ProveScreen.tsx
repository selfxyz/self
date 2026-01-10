// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

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
  ScrollView as ScrollViewType,
} from 'react-native';
import { StyleSheet } from 'react-native';
import { View, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { isMRZDocument } from '@selfxyz/common';
import { loadSelectedDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import { ProofEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import {
  BottomVerifyBar,
  ConnectedWalletBadge,
  DisclosureItem,
  ProofRequestCard,
  proofRequestColors,
  truncateAddress,
  WalletAddressModal,
} from '@/components/proof-request';
import { useSelfAppData } from '@/hooks/useSelfAppData';
import { buttonTap } from '@/integrations/haptics';
import type { RootStackParamList } from '@/navigation';
import {
  setDefaultDocumentTypeIfNeeded,
  usePassport,
} from '@/providers/passportDataProvider';
import {
  getPointsAddress,
  getWhiteListedDisclosureAddresses,
} from '@/services/points';
import { useProofHistoryStore } from '@/stores/proofHistoryStore';
import { ProofStatus } from '@/stores/proofTypes';
import {
  checkDocumentExpiration,
  getDocumentAttributes,
} from '@/utils/documentAttributes';
import { getDocumentTypeName } from '@/utils/documentUtils';

const ProveScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { navigate } = navigation;
  const route = useRoute<RouteProp<RootStackParamList, 'Prove'>>();
  const isFocused = useIsFocused();
  const { useProvingStore, useSelfAppStore } = selfClient;
  const selectedApp = useSelfAppStore(state => state.selfApp);

  // Extract SelfApp data using hook
  const { logoSource, url, formattedUserId, disclosureItems } =
    useSelfAppData(selectedApp);

  const selectedAppRef = useRef<typeof selectedApp>(null);
  const processedSessionsRef = useRef<Set<string>>(new Set());

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollViewContentHeight, setScrollViewContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [hasLayoutMeasurements, setHasLayoutMeasurements] = useState(false);
  const [isDocumentExpired, setIsDocumentExpired] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const isDocumentExpiredRef = useRef(false);
  const scrollViewRef = useRef<ScrollViewType>(null);

  const isContentShorterThanScrollView = useMemo(
    () => scrollViewContentHeight <= scrollViewHeight + 50,
    [scrollViewContentHeight, scrollViewHeight],
  );

  const isScrollable = useMemo(
    () => !isContentShorterThanScrollView && hasLayoutMeasurements,
    [isContentShorterThanScrollView, hasLayoutMeasurements],
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
          endpoint: selectedApp.endpoint,
          endpointType: selectedApp.endpointType,
          status: ProofStatus.PENDING,
          logoBase64: selectedApp.logoBase64,
          disclosures: JSON.stringify(selectedApp.disclosures),
          documentId: selectedDocumentId || '',
        });
      }
    };
    addHistory();
  }, [addProofHistory, loadDocumentCatalog, provingStore.uuid, selectedApp]);

  useEffect(() => {
    // Only update hasScrolledToBottom once we have real layout measurements
    if (hasLayoutMeasurements) {
      if (isContentShorterThanScrollView) {
        setHasScrolledToBottom(true);
      } else {
        setHasScrolledToBottom(false);
      }
    }
  }, [isContentShorterThanScrollView, hasLayoutMeasurements]);

  useEffect(() => {
    if (!isFocused || !selectedApp) {
      return;
    }

    setDefaultDocumentTypeIfNeeded();

    const checkExpirationAndInit = async () => {
      let isExpired = false;
      try {
        const selectedDocument = await loadSelectedDocument(selfClient);
        if (!selectedDocument || !isMRZDocument(selectedDocument.data)) {
          setIsDocumentExpired(false);
          isExpired = false;
          isDocumentExpiredRef.current = false;
        } else {
          const { data: passportData } = selectedDocument;
          const attributes = getDocumentAttributes(passportData);
          const expiryDateSlice = attributes.expiryDateSlice;
          isExpired = checkDocumentExpiration(expiryDateSlice);
          setIsDocumentExpired(isExpired);
          isDocumentExpiredRef.current = isExpired;
        }
        setDocumentType(
          getDocumentTypeName(selectedDocument?.data?.documentCategory),
        );
      } catch (error) {
        console.error('Error checking document expiration:', error);
        setIsDocumentExpired(false);
        isExpired = false;
        isDocumentExpiredRef.current = false;
      }

      if (
        !isExpired &&
        selectedAppRef.current?.sessionId !== selectedApp.sessionId
      ) {
        provingStore.init(selfClient, 'disclose');
      }
      selectedAppRef.current = selectedApp;
    };

    checkExpirationAndInit();
    //removed provingStore from dependencies because it causes infinite re-render on longpressing the button
    //as it sets provingStore.setUserConfirmed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApp?.sessionId, isFocused, selfClient]);

  // Enhance selfApp with user's points address if not already set
  useEffect(() => {
    console.log('useEffect selectedApp', selectedApp);
    if (!selectedApp || selectedApp.selfDefinedData) {
      return;
    }

    const sessionId = selectedApp.sessionId;

    if (processedSessionsRef.current.has(sessionId)) {
      return;
    }

    const enhanceApp = async () => {
      const currentSessionId = sessionId;

      try {
        const address = await getPointsAddress();
        const whitelistedAddresses = await getWhiteListedDisclosureAddresses();

        const isWhitelisted = whitelistedAddresses.some(
          contract =>
            contract.contract_address.toLowerCase() === address.toLowerCase(),
        );

        const currentApp = selfClient.getSelfAppState().selfApp;
        if (currentApp?.sessionId === currentSessionId) {
          if (isWhitelisted) {
            console.log(
              'enhancing app with whitelisted points address',
              address,
            );
            selfClient.getSelfAppState().setSelfApp({
              ...currentApp,
              selfDefinedData: address.toLowerCase(),
            });
          }
        }

        processedSessionsRef.current.add(currentSessionId);
      } catch (error) {
        console.error('Failed enhancing app:', error);
      }
    };

    enhanceApp();
  }, [selectedApp, selfClient]);

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
      const paddingToBottom = 50;
      const isCloseToBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;
      if (
        isCloseToBottom &&
        !hasScrolledToBottom &&
        !isDocumentExpiredRef.current
      ) {
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
      // If we now have both measurements and content fits on screen, enable button immediately
      if (contentHeight > 0 && scrollViewHeight > 0) {
        setHasLayoutMeasurements(true);
        if (contentHeight <= scrollViewHeight + 50) {
          setHasScrolledToBottom(true);
        }
      }
    },
    [scrollViewHeight],
  );

  const handleScrollViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const layoutHeight = event.nativeEvent.layout.height;
      setScrollViewHeight(layoutHeight);
      // If we now have both measurements and content fits on screen, enable button immediately
      if (layoutHeight > 0 && scrollViewContentHeight > 0) {
        setHasLayoutMeasurements(true);
        if (scrollViewContentHeight <= layoutHeight + 50) {
          setHasScrolledToBottom(true);
        }
      }
    },
    [scrollViewContentHeight],
  );

  return (
    <View style={styles.container}>
      <ProofRequestCard
        logoSource={logoSource}
        appName={selectedApp?.appName || 'Self'}
        appUrl={url}
        documentType={documentType}
        connectedWalletBadge={
          formattedUserId ? (
            <ConnectedWalletBadge
              address={
                selectedApp?.userIdType === 'hex'
                  ? truncateAddress(selectedApp?.userId || '')
                  : formattedUserId
              }
              userIdType={selectedApp?.userIdType}
              onToggle={() => setWalletModalOpen(true)}
              testID="prove-screen-wallet-badge"
            />
          ) : undefined
        }
        onScroll={handleScroll}
        scrollViewRef={scrollViewRef}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleScrollViewLayout}
        initialScrollOffset={route.params?.scrollOffset}
        testID="prove-screen-card"
      >
        {/* Disclosure Items */}
        <YStack marginTop={0}>
          {disclosureItems.map((item, index) => (
            <DisclosureItem
              key={item.key}
              text={item.text}
              verified={true}
              isLast={index === disclosureItems.length - 1}
              testID={`prove-screen-disclosure-${item.key}`}
            />
          ))}
        </YStack>
      </ProofRequestCard>

      <BottomVerifyBar
        onVerify={onVerify}
        selectedAppSessionId={selectedApp?.sessionId}
        hasScrolledToBottom={hasScrolledToBottom}
        isScrollable={isScrollable}
        isReadyToProve={isReadyToProve}
        isDocumentExpired={isDocumentExpired}
        testID="prove-screen-verify-bar"
      />

      {formattedUserId && selectedApp?.userId && (
        <WalletAddressModal
          visible={walletModalOpen}
          onClose={() => setWalletModalOpen(false)}
          address={selectedApp.userId}
          userIdType={selectedApp?.userIdType}
          testID="prove-screen-wallet-modal"
        />
      )}
    </View>
  );
};

export default ProveScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: proofRequestColors.white,
  },
});
