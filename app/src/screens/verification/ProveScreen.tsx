// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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
import { StyleSheet, useWindowDimensions } from 'react-native';
import { View, YStack } from 'tamagui';
import type { RouteProp } from '@react-navigation/native';
import {
  useIsFocused,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { DocumentMetadata } from '@selfxyz/common';
import { isMRZDocument } from '@selfxyz/common';
import { loadSelectedDocument, useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import {
  BottomVerifyBar,
  ConnectedWalletBadge,
  DisclosureItem,
  ProofRequestCard,
  proofRequestColors,
  truncateAddress,
  WalletAddressModal,
} from '@/components/proof-request';
import { captureMessage } from '@/config/sentry';
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
  NULLIFIER_ALREADY_USED_ERROR_PREFIX,
} from '@/services/points';
import { useProofHistoryStore } from '@/stores/proofHistoryStore';
import { ProofStatus } from '@/stores/proofTypes';
import { registerModalCallbacks } from '@/utils';
import {
  checkDocumentExpiration,
  getDocumentAttributes,
} from '@/utils/documentAttributes';
import { isDocumentInactive } from '@/utils/documents';
import { getDocumentTypeName } from '@/utils/documentUtils';

const ProveScreen: React.FC = () => {
  const selfClient = useSelfClient();
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
  const [isDocumentExpired, setIsDocumentExpired] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const isDocumentExpiredRef = useRef(false);
  const scrollViewRef = useRef<ScrollViewType>(null);
  const hasInitializedScrollStateRef = useRef(false);

  const [hasCheckedForInactiveDocument, setHasCheckedForInactiveDocument] =
    useState<boolean>(false);

  const isContentShorterThanScrollView = useMemo(
    () => scrollViewContentHeight <= scrollViewHeight + 50,
    [scrollViewContentHeight, scrollViewHeight],
  );

  const isScrollable = useMemo(
    () => !isContentShorterThanScrollView,
    [isContentShorterThanScrollView],
  );
  const provingStore = useProvingStore();
  const currentState = useProvingStore(state => state.currentState);
  const reason = useProvingStore(state => state.reason);
  const isReadyToProve = currentState === 'ready_to_prove';

  // Use window dimensions for dynamic scroll offset padding
  // This scales with viewport height rather than using hardcoded platform values
  const { height: windowHeight } = useWindowDimensions();

  const initialScrollOffset = useMemo(() => {
    if (route.params?.scrollOffset === undefined) {
      return undefined;
    }
    // Use ~1.5% of window height as padding to account for minor layout differences
    // This scales appropriately across different device sizes
    const padding = windowHeight * 0.01;
    return route.params.scrollOffset + padding;
  }, [route.params?.scrollOffset, windowHeight]);

  const { addProofHistory } = useProofHistoryStore();
  const { loadDocumentCatalog } = usePassport();
  const navigateToDocumentOnboarding = useCallback(
    (documentMetadata: DocumentMetadata) => {
      switch (documentMetadata.documentCategory) {
        case 'passport':
        case 'id_card':
          navigate('DocumentOnboarding');
          break;
        case 'aadhaar':
          navigate('AadhaarUpload', { countryCode: 'IND' });
          break;
      }
    },
    [navigate],
  );

  useEffect(() => {
    // Don't check twice
    if (hasCheckedForInactiveDocument) {
      return;
    }

    const checkForInactiveDocument = async () => {
      const catalog = await loadDocumentCatalog();
      const selectedDocumentId = catalog.selectedDocumentId;

      for (const documentMetadata of catalog.documents) {
        if (
          documentMetadata.id === selectedDocumentId &&
          isDocumentInactive(documentMetadata)
        ) {
          const callbackId = registerModalCallbacks({
            onButtonPress: () => navigateToDocumentOnboarding(documentMetadata),
            onModalDismiss: () => navigate('Home' as never),
          });

          navigate('Modal', {
            titleText: 'Your ID needs to be reactivated to continue',
            bodyText:
              'Make sure that you have your document and recovery method ready.',
            buttonText: 'Continue',
            secondaryButtonText: 'Not now',
            callbackId,
          });

          return;
        }
      }

      setHasCheckedForInactiveDocument(true);
    };

    checkForInactiveDocument();
  }, [
    loadDocumentCatalog,
    navigateToDocumentOnboarding,
    navigate,
    hasCheckedForInactiveDocument,
  ]);

  useEffect(() => {
    if (!hasCheckedForInactiveDocument) {
      return;
    }

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
  }, [
    addProofHistory,
    provingStore.uuid,
    selectedApp,
    loadDocumentCatalog,
    hasCheckedForInactiveDocument,
  ]);

  useEffect(() => {
    if (!hasCheckedForInactiveDocument) {
      return;
    }

    // Wait for actual measurements before determining initial scroll state
    // Both start at 0, causing false-positive on first render
    const hasMeasurements = scrollViewContentHeight > 0 && scrollViewHeight > 0;

    if (!hasMeasurements || hasInitializedScrollStateRef.current) {
      return;
    }

    // Only auto-enable if content is short enough that no scrolling is needed
    if (isContentShorterThanScrollView) {
      setHasScrolledToBottom(true);
    }
    // If content is long, leave hasScrolledToBottom as false (require scroll)
    // Don't explicitly set to false to avoid resetting user's scroll progress

    // Mark as initialized so we don't override user's scroll state later
    hasInitializedScrollStateRef.current = true;
  }, [
    isContentShorterThanScrollView,
    scrollViewContentHeight,
    scrollViewHeight,
    hasCheckedForInactiveDocument,
  ]);

  useEffect(() => {
    if (!isFocused || !selectedApp || !hasCheckedForInactiveDocument) {
      return;
    }

    // Reset scroll state tracking for new session
    if (selectedAppRef.current?.sessionId !== selectedApp.sessionId) {
      hasInitializedScrollStateRef.current = false;
      setHasScrolledToBottom(false);

      // After state reset, check if content is short using current measurements.
      // Use setTimeout(0) to ensure we read values AFTER React processes the reset,
      // without adding measurements to dependencies (which causes race conditions).
      setTimeout(() => {
        const hasMeasurements =
          scrollViewContentHeight > 0 && scrollViewHeight > 0;
        const isShort = scrollViewContentHeight <= scrollViewHeight + 50;

        if (hasMeasurements && isShort) {
          setHasScrolledToBottom(true);
          hasInitializedScrollStateRef.current = true;
        }
      }, 0);
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
        // Set selfDefinedData before init so the proving machine has the address
        if (
          !selectedApp.selfDefinedData &&
          !processedSessionsRef.current.has(selectedApp.sessionId)
        ) {
          try {
            const [address, whitelistedAddresses] = await Promise.all([
              getPointsAddress(),
              getWhiteListedDisclosureAddresses(),
            ]);

            const isWhitelisted = whitelistedAddresses.some(
              contract =>
                contract.contract_address.toLowerCase() ===
                selectedApp.endpoint?.toLowerCase(),
            );

            if (isWhitelisted) {
              console.log(
                'enhancing app with whitelisted points address',
                address,
              );
              selfClient.getSelfAppState().setSelfApp({
                ...selectedApp,
                selfDefinedData: address.toLowerCase(),
              });
            }

            processedSessionsRef.current.add(selectedApp.sessionId);
          } catch (error) {
            console.error('Failed enhancing app with points address:', error);
          }
        }

        provingStore.init(selfClient, 'disclose');
      }
      selectedAppRef.current = selectedApp;
    };

    checkExpirationAndInit();
    //removed provingStore from dependencies because it causes infinite re-render on longpressing the button
    //as it sets provingStore.setUserConfirmed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedApp?.sessionId,
    isFocused,
    selfClient,
    hasCheckedForInactiveDocument,
  ]);

  // Track "already disclosed" failures for points disclosures so we can fix
  // the backend state for affected users.
  useEffect(() => {
    if (
      currentState !== 'failure' ||
      !(
        reason?.includes(NULLIFIER_ALREADY_USED_ERROR_PREFIX) ||
        reason?.includes('NullifierAlreadyUsed')
      )
    ) {
      return;
    }

    const trackAlreadyDisclosed = async () => {
      const sessionId = provingStore.uuid;

      try {
        const whitelistedAddresses = await getWhiteListedDisclosureAddresses();
        const isPointsDisclosure = whitelistedAddresses.some(
          contract =>
            contract.contract_address.toLowerCase() ===
            selectedApp?.endpoint?.toLowerCase(),
        );

        if (!isPointsDisclosure) {
          return;
        }

        const pointsAddress =
          selectedApp?.selfDefinedData || (await getPointsAddress());

        captureMessage('Points disclosure already registered on-chain', {
          pointsAddress,
          endpoint: selectedApp?.endpoint,
          sessionId,
        });
      } catch (error) {
        console.error('Failed tracking NullifierAlreadyUsed event:', error);
      }
    };

    trackAlreadyDisclosed();
  }, [currentState, reason, selectedApp, provingStore.uuid]);

  function onVerify() {
    buttonTap();
    provingStore.setUserConfirmed(selfClient);
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
      }
    },
    [hasScrolledToBottom, isContentShorterThanScrollView],
  );

  const handleContentSizeChange = useCallback(
    (contentWidth: number, contentHeight: number) => {
      setScrollViewContentHeight(contentHeight);
    },
    [],
  );

  const handleScrollViewLayout = useCallback((event: LayoutChangeEvent) => {
    const layoutHeight = event.nativeEvent.layout.height;
    setScrollViewHeight(layoutHeight);
  }, []);

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
        initialScrollOffset={initialScrollOffset}
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
        hasCheckedForInactiveDocument={hasCheckedForInactiveDocument}
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
