// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

import passportOnboardingAnimation from '@src/assets/animations/passport_onboarding.json';
import { PrimaryButton } from '@src/components/buttons/PrimaryButton';
import { SecondaryButton } from '@src/components/buttons/SecondaryButton';
import ButtonsContainer from '@src/components/ButtonsContainer';
import TextsContainer from '@src/components/TextsContainer';
import Additional from '@src/components/typography/Additional';
import Description from '@src/components/typography/Description';
import { DescriptionTitle } from '@src/components/typography/DescriptionTitle';
import { PassportEvents } from '@src/consts/analytics';
import useHapticNavigation from '@src/hooks/useHapticNavigation';
import Scan from '@src/images/icons/passport_camera_scan.svg';
import { ExpandableBottomLayout } from '@src/layouts/ExpandableBottomLayout';
import { black, slate100, white } from '@src/utils/colors';
import { hasAnyValidRegisteredDocument } from '@src/utils/proving/validateDocument';

interface PassportOnboardingScreenProps {}

const PassportOnboardingScreen: React.FC<
  PassportOnboardingScreenProps
> = ({}) => {
  const handleCameraPress = useHapticNavigation('PassportCamera');
  const navigateToLaunch = useHapticNavigation('Launch', {
    action: 'cancel',
  });
  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });
  const onCancelPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument();
    if (hasValidDocument) {
      navigateToHome();
    } else {
      navigateToLaunch();
    }
  };
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <SystemBars style="light" />
      <ExpandableBottomLayout.TopSection backgroundColor={white}>
        <LottieView
          ref={animationRef}
          autoPlay={false}
          loop={false}
          source={passportOnboardingAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
          onAnimationFinish={() => {
            setTimeout(() => {
              animationRef.current?.play();
            }, 100);
          }}
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection
        style={styles.bottomSection}
        backgroundColor={white}
      >
        <TextsContainer style={styles.textContainer}>
          <View style={styles.textIconWrapper}>
            <Scan
              style={styles.scanIcon}
              height={40}
              width={40}
              color={black}
            />
            <View>
              <DescriptionTitle>Open to the photograph page</DescriptionTitle>
              <Description textBreakStrategy="balanced">
                Lay the Passport flat and position the machine readable text in
                the viewfinder.
              </Description>
            </View>
          </View>
        </TextsContainer>
        <TextsContainer>
          <Additional textBreakStrategy="balanced">
            Self will not capture an image of your passport.
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
    width: '100%',
    height: '100%',
  },
  textIconWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scanIcon: {
    marginRight: 10,
  },
  textContainer: {
    marginBottom: 10,
  },
  bottomSection: {
    paddingBottom: 32,
  },
});
