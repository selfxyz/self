// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { useNavigation } from '@react-navigation/native';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';
import {
  Additional,
  ButtonsContainer,
  Description,
  PrimaryButton,
  SecondaryButton,
  TextsContainer,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate100,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import passportOnboardingAnimation from '@/assets/animations/passport_onboarding.json';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { impactLight } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { getDocumentScanPrompt } from '@/utils/documentAttributes';

const DocumentOnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const selfClient = useSelfClient();
  const selectedDocumentType = selfClient.useMRZStore(
    state => state.documentType,
  );
  const handleCameraPress = useHapticNavigation('DocumentCamera');
  const animationRef = useRef<LottieView>(null);

  const scanPrompt = getDocumentScanPrompt(selectedDocumentType);

  const onCancelPress = () => {
    impactLight();
    navigation.goBack();
  };

  // iOS: Delay initial animation start to ensure native Lottie module is initialized
  // This screen uses custom looping logic, so we manually trigger the first play
  useEffect(() => {
    const timer = setTimeout(() => {
      animationRef.current?.play();
    }, 100);
    return () => clearTimeout(timer);
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
            }, 220);
          }}
          source={passportOnboardingAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <TextsContainer>
          <Title>{scanPrompt}</Title>
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
