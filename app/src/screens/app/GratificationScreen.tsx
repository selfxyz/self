// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text as RNText,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, YStack } from 'tamagui';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { X } from '@tamagui/lucide-icons';

import { DelayedLottieView } from '@selfxyz/mobile-sdk-alpha';
import youWinAnimation from '@selfxyz/mobile-sdk-alpha/animations/loading/youWin.json';
import { PrimaryButton } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  slate700,
  white,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot, dinotBold } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import GratificationBg from '@/assets/images/gratification_bg.svg';
import SelfLogo from '@/assets/logos/self.svg';
import { SystemBars } from '@/components/SystemBars';
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
import type { RootStackParamList } from '@/navigation';

const GratificationScreen: React.FC = () => {
  const { top, bottom } = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const params = route.params as { points?: number } | undefined;
  const pointsEarned = params?.points ?? 0;
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const s = useResponsiveScale();

  const handleExploreRewards = () => {
    // Navigate to Points screen
    navigation.navigate('Points' as never);
  };

  const handleInviteFriend = () => {
    navigation.navigate('Referral' as never);
  };

  const handleBackPress = () => {
    navigation.navigate('Points' as never);
  };

  const handleAnimationFinish = useCallback(() => {
    setIsAnimationFinished(true);
  }, []);

  const localStyles = React.useMemo(() => createStyles(s), [s]);

  // Show animation first, then content after it finishes
  if (!isAnimationFinished) {
    return (
      <YStack
        flex={1}
        backgroundColor={black}
        alignItems="center"
        justifyContent="center"
      >
        <DelayedLottieView
          autoPlay
          loop={false}
          source={youWinAnimation}
          style={localStyles.animation}
          onAnimationFinish={handleAnimationFinish}
          resizeMode="contain"
          cacheComposition={true}
          renderMode="HARDWARE"
        />
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor={black}>
      <SystemBars style="light" />
      {/* Full screen background */}
      <View
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={0}
        alignItems="center"
        justifyContent="center"
      >
        <GratificationBg
          width={screenWidth * 1.1}
          height={screenHeight * 1.1}
        />
      </View>

      {/* Black overlay for top safe area (status bar) */}
      <View
        position="absolute"
        top={0}
        left={0}
        right={0}
        height={top}
        backgroundColor={black}
        zIndex={1}
      />

      {/* Black overlay for bottom safe area */}
      <View
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        height={bottom}
        backgroundColor={black}
        zIndex={1}
      />

      {/* Back button */}
      <View position="absolute" top={top + s(20)} left={s(20)} zIndex={10}>
        <Pressable onPress={handleBackPress}>
          <View
            backgroundColor={white}
            width={s(46)}
            height={s(46)}
            borderRadius={s(23)}
            alignItems="center"
            justifyContent="center"
          >
            <X width={s(24)} height={s(24)} />
          </View>
        </Pressable>
      </View>

      {/* Main content container */}
      <YStack
        flex={1}
        paddingTop={top + s(54)}
        paddingBottom={bottom + s(50)}
        paddingHorizontal={s(20)}
        zIndex={2}
      >
        {/* Dialogue container */}
        <YStack
          flex={1}
          borderRadius={s(14)}
          borderTopLeftRadius={s(14)}
          borderTopRightRadius={s(14)}
          paddingTop={s(84)}
          paddingBottom={s(24)}
          paddingHorizontal={s(24)}
          alignItems="center"
          justifyContent="center"
        >
          {/* Logo icon */}
          <View marginBottom={s(12)} style={localStyles.logoContainer}>
            <SelfLogo width={s(37)} height={s(37)} />
          </View>

          {/* Points display */}
          <YStack alignItems="center" gap={s(0)} marginBottom={s(18)}>
            <Text
              fontFamily={dinotBold}
              fontSize={s(98)}
              color={white}
              textAlign="center"
              letterSpacing={s(-2)}
              lineHeight={s(98)}
            >
              {pointsEarned}
            </Text>
            <Text
              fontFamily={dinot}
              fontSize={s(48)}
              fontWeight="900"
              color={white}
              textAlign="center"
              letterSpacing={s(-2)}
              lineHeight={s(48)}
            >
              points earned
            </Text>
          </YStack>

          {/* Description text */}
          <Text
            fontFamily={dinot}
            fontSize={s(18)}
            fontWeight="500"
            color={white}
            textAlign="center"
            lineHeight={s(24)}
            marginBottom={s(20)}
            paddingHorizontal={s(0)}
          >
            Earn more points by proving your identity and referring friends
          </Text>
        </YStack>

        {/* Bottom button container */}
        <YStack
          paddingTop={s(20)}
          paddingBottom={s(20)}
          paddingHorizontal={s(20)}
          gap={s(12)}
        >
          <PrimaryButton
            onPress={handleExploreRewards}
            style={localStyles.primaryButton}
          >
            Explore rewards
          </PrimaryButton>
          <Pressable
            onPress={handleInviteFriend}
            style={({ pressed }) => [
              localStyles.secondaryButton,
              pressed && localStyles.secondaryButtonPressed,
            ]}
          >
            <RNText style={localStyles.secondaryButtonText}>
              Invite friends
            </RNText>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  );
};

export default GratificationScreen;

const createStyles = (s: (value: number) => number) =>
  StyleSheet.create({
    primaryButton: {
      borderRadius: s(60),
      borderWidth: 1,
      borderColor: slate700,
      padding: s(14),
    },
    secondaryButton: {
      width: '100%',
      backgroundColor: white,
      borderWidth: 1,
      borderColor: white,
      padding: s(14),
      borderRadius: s(60),
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonPressed: {
      opacity: 0.8,
    },
    secondaryButtonText: {
      fontFamily: dinot,
      fontSize: s(18),
      color: black,
      textAlign: 'center',
    },
    logoContainer: {
      paddingBottom: s(24),
    },
    animation: {
      width: '100%',
      height: '100%',
    },
  });
