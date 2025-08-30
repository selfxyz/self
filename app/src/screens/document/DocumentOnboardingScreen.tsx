// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { useNavigation } from '@react-navigation/native';

import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import passportOnboardingAnimation from '@/assets/animations/passport_onboarding.json';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import ButtonsContainer from '@/components/ButtonsContainer';
import TextsContainer from '@/components/TextsContainer';
import Additional from '@/components/typography/Additional';
import Description from '@/components/typography/Description';
import { Title } from '@/components/typography/Title';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { black, slate100, white } from '@/utils/colors';
import { impactLight } from '@/utils/haptic';

const DocumentOnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const handleCameraPress = useHapticNavigation('DocumentCamera');
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

export default DocumentOnboardingScreen;

const styles = StyleSheet.create({
  animation: {
    backgroundColor: slate100,
    width: '115%',
    height: '115%',
  },
});
