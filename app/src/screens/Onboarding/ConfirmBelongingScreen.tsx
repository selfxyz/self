import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';

import { usePreventRemove } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

import successAnimation from '../../assets/animations/loading/success.json';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import Description from '../../components/typography/Description';
import { Title } from '../../components/typography/Title';
import useHapticNavigation from '../../hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '../../layouts/ExpandableBottomLayout';
import { notificationSuccess } from '../../utils/haptic';
import { styles } from '../ProveFlow/ValidProofScreen';

const ConfirmBelongingScreen: React.FC = () => {
  const onOkPress = useHapticNavigation('Home');

  useEffect(() => {
    notificationSuccess();
  }, []);

  // Prevents back navigation
  usePreventRemove(true, () => {});

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="black" hidden />
      <ExpandableBottomLayout.Layout>
        <ExpandableBottomLayout.TopSection>
          <LottieView
            autoPlay
            loop={false}
            source={successAnimation}
            style={styles.animation}
            cacheComposition={true}
            renderMode="HARDWARE"
          />
        </ExpandableBottomLayout.TopSection>
        <ExpandableBottomLayout.BottomSection gap={20}>
          <Title textAlign="center">Confirm your identity</Title>
          <Description textAlign="center" paddingBottom={20}>
            By continuing, you certify that this passport belongs to you and is
            not stolen or forged.
          </Description>
          <PrimaryButton onPress={onOkPress}>Confirm</PrimaryButton>
        </ExpandableBottomLayout.BottomSection>
      </ExpandableBottomLayout.Layout>
    </>
  );
};

export default ConfirmBelongingScreen;
