// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { StaticScreenProps } from '@react-navigation/native';
import { usePreventRemove } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  PassportEvents,
  ProofEvents,
} from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import successAnimation from '@/assets/animations/loading/success.json';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import Description from '@/components/typography/Description';
import { Title } from '@/components/typography/Title';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { styles } from '@/screens/prove/ProofRequestStatusScreen';
import { flushAllAnalytics, trackNfcEvent } from '@/utils/analytics';
import { black, white } from '@/utils/colors';
import { notificationSuccess } from '@/utils/haptic';
import {
  getFCMToken,
  requestNotificationPermission,
} from '@/utils/notifications/notificationService';
import { useProvingStore } from '@/utils/proving/provingMachine';

type ConfirmBelongingScreenProps = StaticScreenProps<Record<string, never>>;

const ConfirmBelongingScreen: React.FC<ConfirmBelongingScreenProps> = () => {
  const selfClient = useSelfClient();
  const { trackEvent } = selfClient;
  const navigate = useHapticNavigation('Loading', {
    params: {},
  });
  const [_requestingPermission, setRequestingPermission] = useState(false);
  const currentState = useProvingStore(state => state.currentState);
  const init = useProvingStore(state => state.init);
  const setFcmToken = useProvingStore(state => state.setFcmToken);
  const setUserConfirmed = useProvingStore(state => state.setUserConfirmed);
  const isReadyToProve = currentState === 'ready_to_prove';
  useEffect(() => {
    notificationSuccess();
    init(selfClient, 'dsc');
  }, [init, selfClient]);

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
          setFcmToken(token, selfClient);
          trackEvent(ProofEvents.FCM_TOKEN_STORED);
        }
      }

      // Mark as user confirmed - proving will start automatically when ready
      setUserConfirmed(selfClient);

      // Navigate to loading screen
      navigate();
    } catch (error: unknown) {
      console.error('Error initializing proving process:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      trackEvent(ProofEvents.PROVING_PROCESS_ERROR, {
        error: message,
      });
      trackNfcEvent(ProofEvents.PROVING_PROCESS_ERROR, {
        error: message,
      });

      flushAllAnalytics();
    } finally {
      setRequestingPermission(false);
    }
  };

  // Prevents back navigation
  usePreventRemove(true, () => {});

  return (
    <>
      <ExpandableBottomLayout.Layout backgroundColor={black}>
        <ExpandableBottomLayout.TopSection backgroundColor={black}>
          <LottieView
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
          <Title textAlign="center">Confirm your identity</Title>
          <Description textAlign="center" paddingBottom={20}>
            By continuing, you certify that this passport belongs to you and is
            not stolen or forged. Once registered with Self, this document will
            be permanently linked to your identity and can't be linked to
            another one.
          </Description>
          <PrimaryButton
            trackEvent={PassportEvents.OWNERSHIP_CONFIRMED}
            onPress={onOkPress}
            disabled={!isReadyToProve}
          >
            {isReadyToProve ? (
              'Confirm'
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color={black} style={{ marginRight: 8 }} />
                <Description color={black}>Preparing verification</Description>
              </View>
            )}
          </PrimaryButton>
        </ExpandableBottomLayout.BottomSection>
      </ExpandableBottomLayout.Layout>
    </>
  );
};

export default ConfirmBelongingScreen;
