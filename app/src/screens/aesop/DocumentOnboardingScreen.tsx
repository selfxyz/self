// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

import {
  hasAnyValidRegisteredDocument,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import passportOnboardingAnimation from '@/assets/animations/passport_onboarding.json';
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import ButtonsContainer from '@/components/ButtonsContainer';
import TextsContainer from '@/components/TextsContainer';
import Additional from '@/components/typography/Additional';
import Description from '@/components/typography/Description';
import { DescriptionTitle } from '@/components/typography/DescriptionTitle';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import Scan from '@/images/icons/passport_camera_scan.svg';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { black, slate100, white } from '@/utils/colors';

const DocumentOnboardingScreen: React.FC = () => {
  const client = useSelfClient();
  const handleCameraPress = useHapticNavigation('DocumentCamera');
  const navigateToLaunch = useHapticNavigation('Launch', {
    action: 'cancel',
  });
  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });
  const onCancelPress = async () => {
    const hasValidDocument = await hasAnyValidRegisteredDocument(client);
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

export default DocumentOnboardingScreen;

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
