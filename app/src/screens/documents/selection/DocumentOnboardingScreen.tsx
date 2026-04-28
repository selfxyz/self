// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
  amber50,
  amber200,
  amber700,
  black,
  slate100,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import passportOnboardingAnimation from '@/assets/animations/passport_onboarding.json';
import { useKycLauncher } from '@/hooks/useKycLauncher';
import { impactLight } from '@/integrations/haptics';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import type { RootStackParamList } from '@/navigation';
import { useSettingStore } from '@/stores/settingStore';
import { ensureCameraForPassportScan } from '@/utils/cameraPermission';
import { getDocumentScanPrompt } from '@/utils/documentAttributes';

const DocumentOnboardingScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const selfClient = useSelfClient();
  const selectedDocumentType = selfClient.useMRZStore(
    state => state.documentType,
  );
  const countryCode = selfClient.useMRZStore(state => state.countryCode);
  const { launchKycVerification, showKycFallbackModal } = useKycLauncher({
    countryCode: countryCode ?? '',
    cancelLabel: 'Go Back',
  });
  const testRegistrationCircuitArmed = useSettingStore(
    state => state.testRegistrationCircuitArmed,
  );
  const handleCameraPress = useCallback(async () => {
    impactLight();
    const ok = await ensureCameraForPassportScan({
      onFallback: launchKycVerification,
    });
    if (ok) {
      navigation.navigate('DocumentCamera');
    }
  }, [launchKycVerification, navigation]);
  const animationRef = useRef<LottieView>(null);

  const scanPrompt = getDocumentScanPrompt(selectedDocumentType);

  const onCancelPress = () => {
    impactLight();
    showKycFallbackModal(() => navigation.goBack());
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
          {testRegistrationCircuitArmed && (
            <YStack
              backgroundColor={amber50}
              borderColor={amber200}
              borderRadius="$4"
              borderWidth={1}
              gap="$1"
              marginBottom="$4"
              padding="$4"
              testID="test-registration-circuit-banner"
            >
              <Text color={amber700} fontFamily={dinot} fontSize="$5">
                Test registration circuit armed
              </Text>
              <Text color={amber700} fontFamily={dinot} fontSize="$3">
                This scan will bypass the on-chain pre-checks and force the
                register circuit path.
              </Text>
            </YStack>
          )}
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
