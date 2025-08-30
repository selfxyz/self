// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anchor, Text, YStack } from 'tamagui';

import { AppEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import AbstractButton from '@/components/buttons/AbstractButton';
import { BodyText } from '@/components/typography/BodyText';
import { Caption } from '@/components/typography/Caption';
import { privacyUrl, supportedBiometricIdsUrl, termsUrl } from '@/consts/links';
import useConnectionModal from '@/hooks/useConnectionModal';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import Logo from '@/images/logo.svg';
import { black, slate400, white, zinc800, zinc900 } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { advercase, dinot } from '@/utils/fonts';

const LaunchScreen: React.FC = () => {
  useConnectionModal();
  const onStartPress = useHapticNavigation('DocumentOnboarding');
  const createMock = useHapticNavigation('CreateMock');
  const { bottom } = useSafeAreaInsets();

  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      createMock();
    });

  return (
    <YStack
      backgroundColor={black}
      flex={1}
      justifyContent="space-between"
      alignItems="center"
      paddingHorizontal={20}
      paddingBottom={bottom + extraYPadding}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <GestureDetector gesture={devModeTap}>
            <View style={styles.logoSection}>
              <Logo style={styles.logo} />
            </View>
          </GestureDetector>

          <Text style={styles.title}>Get started</Text>

          <BodyText style={styles.description}>
            Register with Self using your passport or biometric ID to prove your
            identity across the web without revealing your personal information.
          </BodyText>
        </View>
      </View>

      <YStack gap="$3" width="100%" alignItems="center" marginBottom={20}>
        <YStack gap="$3" width="100%">
          <AbstractButton
            bgColor={black}
            borderColor={zinc800}
            borderWidth={1}
            color={white}
            trackEvent={AppEvents.SUPPORTED_BIOMETRIC_IDS}
            onPress={async () => {
              try {
                await Linking.openURL(supportedBiometricIdsUrl);
              } catch (error) {
                console.warn('Failed to open supported IDs URL:', error);
              }
            }}
          >
            List of Supported Biometric IDs
          </AbstractButton>

          <AbstractButton
            trackEvent={AppEvents.GET_STARTED}
            onPress={onStartPress}
            bgColor={white}
            color={black}
            testID="launch-get-started-button"
          >
            I have a Passport or Biometric ID
          </AbstractButton>
        </YStack>

        <Caption style={styles.notice}>
          By continuing, you agree to the&nbsp;
          <Anchor style={styles.link} href={termsUrl}>
            User Terms and Conditions
          </Anchor>
          &nbsp;and acknowledge the&nbsp;
          <Anchor style={styles.link} href={privacyUrl}>
            Privacy notice
          </Anchor>
          &nbsp;of Self provided by Self Inc.
        </Caption>
      </YStack>
    </YStack>
  );
};

export default LaunchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '102%',
    paddingTop: '25%',
  },
  card: {
    width: '100%',
    marginTop: '30%',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: zinc900,
    shadowColor: black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  logoSection: {
    width: 60,
    height: 60,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontFamily: advercase,
    fontSize: 38,
    fontWeight: '500',
    color: white,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    color: white,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  notice: {
    fontFamily: dinot,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: slate400,
    textAlign: 'center',
    lineHeight: 18,
    fontSize: 14,
  },
  link: {
    fontFamily: dinot,
    color: slate400,
    lineHeight: 18,
    textDecorationLine: 'underline',
  },
});
