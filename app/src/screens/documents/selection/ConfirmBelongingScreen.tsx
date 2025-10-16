// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useEffect, useState } from 'react';
import type { StaticScreenProps } from '@react-navigation/native';
import { usePreventRemove } from '@react-navigation/native';

import type { DocumentCategory } from '@selfxyz/common/utils/types';
import {
  DelayedLottieView,
  loadSelectedDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  Description,
  PrimaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import {
  PassportEvents,
  ProofEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import { getPreRegistrationDescription } from '@selfxyz/mobile-sdk-alpha/onboarding/confirm-identification';

import successAnimation from '@/assets/animations/loading/success.json';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { styles } from '@/screens/verification/ProofRequestStatusScreen';
import { useSettingStore } from '@/stores/settingStore';
import { flushAllAnalytics, trackNfcEvent } from '@/utils/analytics';
import { black, white } from '@/utils/colors';
import { notificationSuccess } from '@/utils/haptic';
import {
  getFCMToken,
  requestNotificationPermission,
} from '@/utils/notifications/notificationService';

type ConfirmBelongingScreenProps = StaticScreenProps<Record<string, never>>;

const ConfirmBelongingScreen: React.FC<ConfirmBelongingScreenProps> = () => {
  const selfClient = useSelfClient();
  const [documentMetadata, setDocumentMetadata] = useState<{
    documentCategory?: DocumentCategory;
    signatureAlgorithm?: string;
    curveOrExponent?: string;
  }>({});
  const { trackEvent } = selfClient;
  const navigate = useHapticNavigation('Loading', {
    params: {
      documentCategory: documentMetadata.documentCategory,
      signatureAlgorithm: documentMetadata.signatureAlgorithm,
      curveOrExponent: documentMetadata.curveOrExponent,
    },
  });
  const [_requestingPermission, setRequestingPermission] = useState(false);
  const setFcmToken = useSettingStore(state => state.setFcmToken);

  useEffect(() => {
    notificationSuccess();

    const initializeProving = async () => {
      try {
        const selectedDocument = await loadSelectedDocument(selfClient);
        let metadata: {
          documentCategory?: DocumentCategory;
          signatureAlgorithm?: string;
          curveOrExponent?: string;
        };
        if (selectedDocument?.data?.documentCategory === 'aadhaar') {
          metadata = {
            documentCategory: 'aadhaar',
            signatureAlgorithm: 'rsa',
            curveOrExponent: '65537',
          };
        } else {
          const passportData = selectedDocument?.data;
          metadata = {
            documentCategory: passportData?.documentCategory,
            signatureAlgorithm:
              passportData?.passportMetadata?.cscaSignatureAlgorithm,
            curveOrExponent:
              passportData?.passportMetadata?.cscaCurveOrExponent,
          };
        }
        setDocumentMetadata(metadata);
      } catch {
        // setting defaults on error
        setDocumentMetadata({
          documentCategory: 'passport',
          signatureAlgorithm: 'rsa',
          curveOrExponent: '65537',
        });
      }
    };

    initializeProving();
  }, [selfClient]);

  const onOkPress = async () => {
    try {
      setRequestingPermission(true);
      trackEvent(ProofEvents.NOTIFICATION_PERMISSION_REQUESTED);
      trackNfcEvent(ProofEvents.NOTIFICATION_PERMISSION_REQUESTED);

      // Request notification permission
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
          trackEvent(ProofEvents.FCM_TOKEN_STORED);
        }
      }

      navigate();
    } catch (error: unknown) {
      console.error('Error navigating:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      trackEvent(ProofEvents.PROVING_PROCESS_ERROR, {
        error: message,
      });
      trackNfcEvent(ProofEvents.PROVING_PROCESS_ERROR, {
        error: message,
      });

      flushAllAnalytics();
    }
  };

  // Prevents back navigation
  usePreventRemove(true, () => {});

  return (
    <>
      <ExpandableBottomLayout.Layout backgroundColor={black}>
        <ExpandableBottomLayout.TopSection backgroundColor={black}>
          <DelayedLottieView
            autoPlay
            loop={false}
            source={successAnimation}
            style={styles.animation}
            cacheComposition={true}
            renderMode="HARDWARE"
          />
        </ExpandableBottomLayout.TopSection>
        <ExpandableBottomLayout.BottomSection
          gap={20}
          paddingBottom={20}
          backgroundColor={white}
        >
          <Title style={{ textAlign: 'center' }}>Confirm your identity</Title>
          <Description style={{ textAlign: 'center', paddingBottom: 20 }}>
            {getPreRegistrationDescription()}
          </Description>
          <PrimaryButton
            trackEvent={PassportEvents.OWNERSHIP_CONFIRMED}
            onPress={onOkPress}
          >
            Confirm
          </PrimaryButton>
        </ExpandableBottomLayout.BottomSection>
      </ExpandableBottomLayout.Layout>
    </>
  );
};

export default ConfirmBelongingScreen;
