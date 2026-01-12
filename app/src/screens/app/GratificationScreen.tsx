// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text as RNText,
} from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
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
          style={styles.animation}
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
      <View position="absolute" top={top + 20} left={20} zIndex={10}>
        <Pressable onPress={handleBackPress}>
          <View
            backgroundColor={white}
            width={46}
            height={46}
            borderRadius={23}
            alignItems="center"
            justifyContent="center"
          >
            <X width={24} height={24} />
          </View>
        </Pressable>
      </View>

      {/* Main content container */}
      <YStack
        flex={1}
        paddingTop={top + 54}
        paddingBottom={bottom + 50}
        paddingHorizontal={20}
        zIndex={2}
      >
        {/* Dialogue container */}
        <YStack
          flex={1}
          borderRadius={14}
          borderTopLeftRadius={14}
          borderTopRightRadius={14}
          paddingTop={84}
          paddingBottom={24}
          paddingHorizontal={24}
          alignItems="center"
          justifyContent="center"
        >
          {/* Logo icon */}
          <View marginBottom={12} style={styles.logoContainer}>
            <SelfLogo width={37} height={37} />
          </View>

          {/* Points display */}
          <YStack alignItems="center" gap={0} marginBottom={18}>
            <Text
              fontFamily={dinotBold}
              fontSize={98}
              color={white}
              textAlign="center"
              letterSpacing={-2}
              lineHeight={98}
            >
              {pointsEarned}
            </Text>
            <Text
              fontFamily={dinot}
              fontSize={48}
              fontWeight="900"
              color={white}
              textAlign="center"
              letterSpacing={-2}
              lineHeight={48}
            >
              points earned
            </Text>
          </YStack>

          {/* Description text */}
          <Text
            fontFamily={dinot}
            fontSize={18}
            fontWeight="500"
            color={white}
            textAlign="center"
            lineHeight={24}
            marginBottom={20}
            paddingHorizontal={0}
          >
            Earn more points by proving your identity and referring friends
          </Text>
        </YStack>

        {/* Bottom button container */}
        <YStack
          paddingTop={20}
          paddingBottom={20}
          paddingHorizontal={20}
          gap={12}
        >
          <PrimaryButton
            onPress={handleExploreRewards}
            style={styles.primaryButton}
          >
            Explore rewards
          </PrimaryButton>
          <Pressable
            onPress={handleInviteFriend}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <RNText style={styles.secondaryButtonText}>Invite friends</RNText>
          </Pressable>
        </YStack>
      </YStack>
    </YStack>
  );
};

export default GratificationScreen;

const styles = StyleSheet.create({
  primaryButton: {
    borderRadius: 60,
    borderWidth: 1,
    borderColor: slate700,
    padding: 14,
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: white,
    borderWidth: 1,
    borderColor: white,
    padding: 14,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonPressed: {
    opacity: 0.8,
  },
  secondaryButtonText: {
    fontFamily: dinot,
    fontSize: 18,
    color: black,
    textAlign: 'center',
  },
  logoContainer: {
    paddingBottom: 24,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
});
