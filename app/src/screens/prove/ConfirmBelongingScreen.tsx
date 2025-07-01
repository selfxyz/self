// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

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
import { captureException } from '../../Sentry';
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

      // Ensure proving store is initialized before navigation
      if (provingStore.circuitType !== 'dsc') {
        try {
          console.error(
            'Re-initializing proving store with DSC circuit type before navigation',
          );
          trackEvent(ProofEvents.PROVING_STORE_REINITIALIZED, {
            reason: 'circuit_type_mismatch',
            expected_type: 'dsc',
            current_type: provingStore.circuitType,
          });
          await provingStore.init('dsc', true);
        } catch (error: any) {
          console.error('Error during proving store re-initialization:', error);
          captureException(error, {
            context: 'proving_store_reinitialization',
            circuit_type: 'dsc',
            current_circuit_type: provingStore.circuitType,
          });
          trackEvent(ProofEvents.PROVING_PROCESS_ERROR, {
            error: error?.message || 'Unknown re-initialization error',
            context: 'proving_store_reinitialization',
          });
          throw error; // Re-throw to be handled by the outer try-catch
        }
      }

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
