//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import { StaticScreenProps, usePreventRemove } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import successAnimation from '../../assets/animations/loading/success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import { PassportEvents, ProofEvents } from '../../consts/analytics';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import analytics from '../../utils/analytics';
import { black, white } from '../../utils/colors';
import { notificationSuccess } from '../../utils/haptic';
import {
  getFCMToken,
  requestNotificationPermission,
} from '../../utils/notifications/notificationService';
import { useProvingStore } from '../../utils/proving/provingMachine';
import { styles } from './ProofRequestStatusScreen';

type ConfirmBelongingScreenProps = StaticScreenProps<{}>;

const { trackEvent } = analytics();

const ConfirmBelongingScreen: React.FC<ConfirmBelongingScreenProps> = ({}) => {
  const navigate = useHapticNavigation('LoadingScreen', {
    params: {},
  });
  const provingStore = useProvingStore();
  const [_requestingPermission, setRequestingPermission] = useState(false);
  const currentState = useProvingStore(state => state.currentState);
  const isReadyToProve = currentState === 'ready_to_prove';

  useEffect(() => {
    notificationSuccess();
    provingStore.init('dsc');
  }, []);

  const onOkPress = async () => {
    try {
      setRequestingPermission(true);
      trackEvent(ProofEvents.NOTIFICATION_PERMISSION_REQUESTED);

      // Request notification permission
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        const token = await getFCMToken();
        if (token) {
          provingStore.setFcmToken(token);
          trackEvent(ProofEvents.FCM_TOKEN_STORED);
          console.log('FCM token stored in proving store');
        }
      }

      // Mark as user confirmed - proving will start automatically when ready
      provingStore.setUserConfirmed();

      // Navigate to loading screen
      navigate();
    } catch (error: any) {
      console.error('Error initializing proving process:', error);
      trackEvent(ProofEvents.PROVING_PROCESS_ERROR, {
        error: error?.message || 'Unknown error',
      });
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
            not stolen or forged.
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
