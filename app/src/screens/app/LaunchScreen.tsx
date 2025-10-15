// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Anchor, Text, YStack } from 'tamagui';

import {
  AbstractButton,
  BodyText,
  Caption,
} from '@selfxyz/mobile-sdk-alpha/components';
import { AppEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { privacyUrl, termsUrl } from '@/consts/links';
import useConnectionModal from '@/hooks/useConnectionModal';
import useHapticNavigation from '@/hooks/useHapticNavigation';
import useCompactLayout from '@/hooks/useCompactLayout';
import IDCardPlaceholder from '@/images/icons/id_card_placeholder.svg';
import {
  black,
  red500,
  slate300,
  slate400,
  white,
  zinc800,
} from '@/utils/colors';
import { advercase, dinot } from '@/utils/fonts';

const LaunchScreen: React.FC = () => {
  useConnectionModal();
  const onPress = useHapticNavigation('CountryPicker');
  const createMock = useHapticNavigation('CreateMock');
  const { bottom } = useSafeAreaInsets();
  const {
    width: screenWidth,
    height: screenHeight,
    selectResponsiveValue,
    getResponsiveHorizontalPadding,
  } = useCompactLayout();
  const cardWidth = Math.min(screenWidth * 0.8, 320);
  const cardHeight = cardWidth * (180 / 300);
  const titleSize = selectResponsiveValue(30, 38, 'width');
  const bodySize = selectResponsiveValue(15, 16, 'width');
  const bodyHorizontalMargin = getResponsiveHorizontalPadding({
    percent: 0.08,
    min: 20,
  });
  const heroSpacing = selectResponsiveValue(24, 40, 'width');
  const topPadding = Math.max(
    screenHeight * 0.08,
    selectResponsiveValue(32, 60, 'width'),
  );
  const ctaPaddingHorizontal = getResponsiveHorizontalPadding({ percent: 0.07 });
  const ctaPaddingTop = selectResponsiveValue(20, 30, 'width');

  const devModeTap = Gesture.Tap()
    .numberOfTaps(5)
    .onStart(() => {
      createMock();
    });

  return (
    <YStack backgroundColor={black} flex={1} alignItems="center">
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <GestureDetector gesture={devModeTap}>
            <YStack
              backgroundColor={red500}
              borderRadius={14}
              overflow="hidden"
            >
              <IDCardPlaceholder width={cardWidth} height={cardHeight} />
            </YStack>
          </GestureDetector>
        </YStack>
        <Text
          color={white}
          fontSize={titleSize}
          fontFamily={advercase}
          fontWeight="500"
          textAlign="center"
          marginBottom={16}
        >
          Take control of your digital identity
        </Text>
        <BodyText
          style={{
            color: slate300,
            fontSize: bodySize,
            textAlign: 'center',
            marginHorizontal: bodyHorizontalMargin,
            marginBottom: heroSpacing,
          }}
        >
          Self is the easiest way to verify your identity safely wherever you
          are.
        </BodyText>
      </View>

      <YStack
        gap="$3"
        width="100%"
        alignItems="center"
        paddingHorizontal={ctaPaddingHorizontal}
        paddingBottom={bottom + 12}
        paddingTop={ctaPaddingTop}
        backgroundColor={zinc800}
      >
        <AbstractButton
          trackEvent={AppEvents.GET_STARTED}
          onPress={onPress}
          bgColor={white}
          color={black}
          testID="launch-get-started-button"
        >
          Get Started
        </AbstractButton>

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
    justifyContent: 'center',
    alignItems: 'center',
    width: '102%',
  },
  card: {
    width: '100%',
    marginTop: '20%',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 8,
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

  notice: {
    fontFamily: dinot,
    marginVertical: 10,
    paddingBottom: 10,
    color: slate400,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
  },
  link: {
    fontFamily: dinot,
    color: slate400,
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
});
