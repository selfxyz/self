// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import { ScrollView, Spinner, YStack } from 'tamagui';
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
import { DocumentEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { black, slate50 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { useSafeBottomPadding } from '@selfxyz/mobile-sdk-alpha/hooks';

import EmptyIdCard from '@/components/homescreen/EmptyIdCard';
import ExpiredIdCard from '@/components/homescreen/ExpiredIdCard';
import IdCardLayout from '@/components/homescreen/IdCard';
import PendingIdCard from '@/components/homescreen/PendingIdCard';
import UnregisteredIdCard from '@/components/homescreen/UnregisteredIdCard';
import { useAppUpdates } from '@/hooks/useAppUpdates';
import useConnectionModal from '@/hooks/useConnectionModal';
import { useReferralConfirmation } from '@/hooks/useReferralConfirmation';
import { useRegisterReferral } from '@/hooks/useRegisterReferral';
import { useTestReferralFlow } from '@/hooks/useTestReferralFlow';
import type { RootStackParamList } from '@/navigation';
import { usePassport } from '@/providers/passportDataProvider';
import { usePendingKycStore } from '@/stores/pendingKycStore';
import { useSettingStore } from '@/stores/settingStore';
import useUserStore from '@/stores/userStore';
import {
  checkDocumentExpiration,
  getDocumentAttributes,
} from '@/utils/documentAttributes';
import { isDocumentInactive } from '@/utils/documents';

const HomeScreen: React.FC = () => {
  const selfClient = useSelfClient();
  const referrer = useUserStore(state => state.deepLinkReferrer);
  const hasReferrer = referrer !== undefined;
  useConnectionModal();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setIdDetailsDocumentId } = useUserStore();
  const { getAllDocuments, loadDocumentCatalog, setSelectedDocument } =
    usePassport();
  const [isNewVersionAvailable, showAppUpdateModal, isModalDismissed] =
    useAppUpdates();
  const [documentCatalog, setDocumentCatalog] = useState<DocumentCatalog>({
    documents: [],
  });
  const [allDocuments, setAllDocuments] = useState<
    Record<string, { data: IDDocument; metadata: DocumentMetadata }>
  >({});
  const [loading, setLoading] = useState(true);
  const hasIncrementedOnFocus = useRef(false);
  const [isSelectedDocumentInactive, setIsSelectedDocumentInactive] = useState<
    boolean | null
  >(null);

  const { pendingVerifications, removeExpiredVerifications } =
    usePendingKycStore();

  useEffect(() => {
    removeExpiredVerifications();
  }, [removeExpiredVerifications]);

  const activePendingVerifications = pendingVerifications.filter(
    v => v.status === 'pending' || v.status === 'processing',
  );

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

      if (catalog.selectedDocumentId) {
        const documentData = docs[catalog.selectedDocumentId];

        if (documentData) {
          try {
            setIsSelectedDocumentInactive(
              isDocumentInactive(documentData.metadata),
            );
          } catch (error) {
            // we don't want to block the home screen from loading
            console.warn('Failed to check if document is inactive:', error);
          }
        }
      }
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

  useFocusEffect(
    useCallback(() => {
      if (hasIncrementedOnFocus.current) {
        return;
      }

      hasIncrementedOnFocus.current = true;
      useSettingStore.getState().incrementHomeScreenViewCount();

      return () => {
        hasIncrementedOnFocus.current = false;
      };
    }, []),
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

  const { registerReferral } = useRegisterReferral();

  const handleReferralConfirmed = useCallback(async () => {
    if (!referrer) {
      return;
    }
    const store = useUserStore.getState();
    if (!store.isReferrerRegistered(referrer)) {
      const result = await registerReferral(referrer);
      if (result.success) {
        store.markReferrerAsRegistered(referrer);
      }
    }
    store.clearDeepLinkReferrer();
  }, [referrer, registerReferral]);

  useReferralConfirmation({
    hasReferrer,
    onConfirmed: handleReferralConfirmed,
  });

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
        <Spinner size="large" color={black} />
      </YStack>
    );
  }

  return (
    <YStack
      backgroundColor={'#F8FAFC'}
      flex={1}
      alignItems="center"
      testID="home-screen-root"
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
        {/* Show pending KYC cards at the top */}
        {activePendingVerifications.map(verification => (
          <PendingIdCard
            key={verification.sessionId}
            onClick={() => {
              if (
                verification.status === 'processing' &&
                verification.documentId
              ) {
                navigation.navigate('KYCVerified', {
                  documentId: verification.documentId,
                });
              }
            }}
          />
        ))}

        {/* Show EmptyIdCard only when no documents AND no pending verifications */}
        {documentCatalog.documents.length === 0 &&
          activePendingVerifications.length === 0 && (
            <EmptyIdCard
              onRegisterPress={() => {
                navigation.navigate('CountryPicker');
              }}
            />
          )}

        {/* Show document cards */}
        {documentCatalog.documents.map((metadata: DocumentMetadata) => {
          const documentData = allDocuments[metadata.id];
          const isSelected = documentCatalog.selectedDocumentId === metadata.id;

          if (!documentData) {
            return null;
          }
          //return early if the document is a pending KYC document as we are already displaying
          //another card.
          if (
            !documentData.metadata.isRegistered &&
            activePendingVerifications.some(
              doc => doc.documentId === documentData.metadata.id,
            )
          ) {
            return;
          }

          // Show UnregisteredIdCard for documents not yet registered on-chain
          if (!documentData.metadata.isRegistered) {
            return (
              <UnregisteredIdCard
                key={metadata.id}
                onRegisterPress={async () => {
                  await setSelectedDocument(metadata.id);
                  navigation.navigate('ConfirmBelonging', {});
                }}
              />
            );
          }

          // Check if document is expired
          const attributes = getDocumentAttributes(documentData.data);
          const isExpired = checkDocumentExpiration(attributes.expiryDateSlice);

          if (isExpired) {
            return <ExpiredIdCard key={metadata.id} />;
          }

          // Show normal IdCardLayout for valid registered documents
          return (
            <Pressable
              key={metadata.id}
              onPress={() => handleDocumentPress(metadata, documentData.data)}
            >
              <IdCardLayout
                idDocument={documentData.data}
                isInactive={
                  isSelected &&
                  isSelectedDocumentInactive === true &&
                  !metadata.mock
                }
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
