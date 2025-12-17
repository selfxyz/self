// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { View, XStack, YStack } from 'tamagui';
import { useIsFocused } from '@react-navigation/native';

import {
  DelayedLottieView,
  dinot,
  useSelfClient,
} from '@selfxyz/mobile-sdk-alpha';
import {
  Additional,
  Description,
  SecondaryButton,
  Title,
} from '@selfxyz/mobile-sdk-alpha/components';
import { PassportEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';
import {
  black,
  slate400,
  slate800,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import {
  mrzReadInstructions,
  useReadMRZ,
} from '@selfxyz/mobile-sdk-alpha/onboarding/read-mrz';

import passportScanAnimation from '@/assets/animations/passport_scan.json';
import Scan from '@/assets/icons/passport_camera_scan.svg';
import { PassportCamera } from '@/components/native/PassportCamera';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import { ExpandableBottomLayout } from '@/layouts/ExpandableBottomLayout';
import { getDocumentScanPrompt } from '@/utils/documentAttributes';

const DocumentCameraScreen: React.FC = () => {
  const isFocused = useIsFocused();
  const selfClient = useSelfClient();
  const selectedDocumentType = selfClient.useMRZStore(
    state => state.documentType,
  );

  // Add a ref to track when the camera screen is mounted
  const scanStartTimeRef = useRef(Date.now());
  const { onPassportRead } = useReadMRZ(scanStartTimeRef);

  const scanPrompt = getDocumentScanPrompt(selectedDocumentType);

  const navigateToHome = useHapticNavigation('Home', {
    action: 'cancel',
  });

  const onCancelPress = async () => {
    navigateToHome();
  };

  return (
    <ExpandableBottomLayout.Layout backgroundColor={white}>
      <ExpandableBottomLayout.TopSection roundTop backgroundColor={black}>
        <PassportCamera onPassportRead={onPassportRead} isMounted={isFocused} />
        <DelayedLottieView
          autoPlay
          loop
          source={passportScanAnimation}
          style={styles.animation}
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </ExpandableBottomLayout.TopSection>
      <ExpandableBottomLayout.BottomSection backgroundColor={white}>
        <YStack alignItems="center" gap="$2.5">
          <YStack alignItems="center" gap="$6" paddingBottom="$2.5">
            <Title>{scanPrompt}</Title>
            <XStack gap="$6" alignSelf="flex-start" alignItems="flex-start">
              <View paddingTop="$2">
                <Scan height={40} width={40} color={slate800} />
              </View>
              <View maxWidth="75%">
                <Description style={styles.subheader}>
                  Open to the photograph page
                </Description>
                <Additional style={styles.description}>
                  {mrzReadInstructions()}
                </Additional>
              </View>
            </XStack>
          </YStack>

          <Additional style={styles.disclaimer}>
            Self will not capture an image of your ID.
          </Additional>

          <SecondaryButton
            trackEvent={PassportEvents.CAMERA_SCREEN_CLOSED}
            onPress={onCancelPress}
          >
            Cancel
          </SecondaryButton>
        </YStack>
      </ExpandableBottomLayout.BottomSection>
    </ExpandableBottomLayout.Layout>
  );
};

export default DocumentCameraScreen;

const styles = StyleSheet.create({
  animation: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  subheader: {
    color: slate800,
    textAlign: 'left',
    textAlignVertical: 'top',
  },
  description: {
    textAlign: 'left',
  },
  disclaimer: {
    fontFamily: dinot,
    textAlign: 'center',
    fontSize: 11,
    color: slate400,
    textTransform: 'uppercase',
    width: '100%',
    alignSelf: 'center',
    letterSpacing: 0.44,
    marginTop: 0,
    marginBottom: 10,
  },
});
