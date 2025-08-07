// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

import { useNavigation } from '@react-navigation/native';
import passportOnboardingAnimation from '@src/assets/animations/passport_onboarding.json';
import { PrimaryButton } from '@src/components/buttons/PrimaryButton';
import { SecondaryButton } from '@src/components/buttons/SecondaryButton';
import ButtonsContainer from '@src/components/ButtonsContainer';
import TextsContainer from '@src/components/TextsContainer';
import Additional from '@src/components/typography/Additional';
import Description from '@src/components/typography/Description';
import { Title } from '@src/components/typography/Title';
import { PassportEvents } from '@src/consts/analytics';
import useHapticNavigation from '@src/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@src/layouts/ExpandableBottomLayout';
import { black, slate100, white } from '@src/utils/colors';
import { impactLight } from '@src/utils/haptic';

interface PassportOnboardingScreenProps {}

const PassportOnboardingScreen: React.FC<
  PassportOnboardingScreenProps
> = ({}) => {
  const navigation = useNavigation();
  const handleCameraPress = useHapticNavigation('PassportCamera');
  const animationRef = useRef<LottieView>(null);

  const onCancelPress = () => {
    impactLight();
    navigation.goBack();
  };

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={black}>
      <SystemBars style="light" />
      <ExpandableBottomLayout.TopSection roundTop backgroundColor={black}>
        <LottieView
          ref={animationRef}
          autoPlay={false}
          loop={false}
          onAnimationFinish={() => {
            setTimeout(() => {
              animationRef.current?.play();
            }, 5000); // Pause 5 seconds before playing again
          }}
          source={passportOnboardingAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <TextsContainer>
          <Title>Scan your ID</Title>
          <Description textBreakStrategy="balanced">
            Open to the photo page
          </Description>
          <Additional textBreakStrategy="balanced">
            Lay your document flat and position the machine readable text in the
            viewfinder
          </Additional>
        </TextsContainer>
        <ButtonsContainer>
          <PrimaryButton
            trackEvent={PassportEvents.CAMERA_SCAN_STARTED}
            onPress={handleCameraPress}
          >
            Open Camera
          </PrimaryButton>
          <SecondaryButton
            trackEvent={PassportEvents.CAMERA_SCAN_CANCELLED}
            onPress={onCancelPress}
          >
            Cancel
          </SecondaryButton>
        </ButtonsContainer>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default PassportOnboardingScreen;

const styles = StyleSheet.create({
  animation: {
    backgroundColor: slate100,
    width: '115%',
    height: '115%',
  },
});
