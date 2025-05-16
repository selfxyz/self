import { StaticScreenProps, usePreventRemove } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import successAnimation from '../../assets/animations/loading/success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { black, white } from '../../utils/colors';
import { notificationSuccess } from '../../utils/haptic';
import {
  getFCMToken,
  requestNotificationPermission,
} from '../../utils/notifications/notificationService';
import { useProvingStore } from '../../utils/proving/provingMachine';
import { styles } from './ProofRequestStatusScreen';

type ConfirmBelongingScreenProps = StaticScreenProps<
  | {
      mockPassportFlow?: boolean;
    }
  | undefined
>;

const ConfirmBelongingScreen: React.FC<ConfirmBelongingScreenProps> = ({
  route,
}) => {
  const mockPassportFlow = route.params?.mockPassportFlow;
  const navigate = useHapticNavigation('LoadingScreen', {
    params: {
      mockPassportFlow,
    },
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

      // Request notification permission
      const permissionGranted = await requestNotificationPermission();
      if (permissionGranted) {
        const token = await getFCMToken();
        if (token) {
          provingStore.setFcmToken(token);
          console.log('FCM token stored in proving store');
        }
      }

      // Mark as user confirmed - proving will start automatically when ready
      provingStore.setUserConfirmed();

      // Navigate to loading screen
      navigate();
    } catch (error) {
      console.error('Error initializing proving process:', error);
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
          <PrimaryButton onPress={onOkPress} disabled={!isReadyToProve}>
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
