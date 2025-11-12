// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type LottieView from 'lottie-react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { DelayedLottieView } from '@selfxyz/mobile-sdk-alpha';
import {
  black,
  cyan300,
  slate400,
  slate600,
  white,
  zinc500,
  zinc900,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { advercase, dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import CloseWarningIcon from '@/assets/icons/close_warning.svg';
import Plus from '@/assets/icons/plus_slate600.svg';
import { extraYPadding } from '@/utils/styleUtils';

interface LoadingUIProps {
  animationSource: LottieView['props']['source'];
  shouldLoopAnimation: boolean;
  actionText: string;
  actionSubText: string;
  estimatedTime: string;
  canCloseApp: boolean;
  statusBarProgress: number;
}

const LoadingUI: React.FC<LoadingUIProps> = ({
  animationSource,
  shouldLoopAnimation,
  actionText,
  actionSubText,
  estimatedTime,
  canCloseApp,
  statusBarProgress,
}) => {
  const { bottom } = useSafeAreaInsets();

  const renderProgressBars = () => {
    const bars = [];
    for (let i = 0; i < 3; i++) {
      bars.push(
        <View
          key={`bar-${i}`}
          width={35}
          height={6}
          borderRadius={100}
          backgroundColor={i < statusBarProgress ? cyan300 : slate600}
          borderWidth={1}
          borderColor={i < statusBarProgress ? cyan300 : slate600}
        />,
      );
    }
    bars.push(
      <View key="plus" marginHorizontal={8}>
        <Plus color={slate600} height={14} width={14} />
      </View>,
    );
    for (let i = 3; i < 6; i++) {
      bars.push(
        <View
          key={`bar-${i}`}
          width={35}
          height={6}
          borderRadius={100}
          borderWidth={1}
          borderColor={i < statusBarProgress ? cyan300 : slate600}
          backgroundColor={
            i < statusBarProgress
              ? cyan300
              : statusBarProgress / 3 > 1
                ? slate600
                : 'transparent'
          }
        />,
      );
    }

    return bars;
  };

  return (
    <YStack
      backgroundColor={black}
      gap={20}
      justifyContent="space-between"
      flex={1}
      paddingBottom={bottom + extraYPadding}
    >
      <YStack
        flex={1}
        paddingHorizontal={15}
        position="relative"
        backgroundColor={black}
        justifyContent="center"
        alignItems="center"
      >
        <YStack
          width="100%"
          height={380}
          borderRadius={16}
          paddingVertical={20}
          alignItems="center"
          backgroundColor={zinc900}
          shadowColor={black}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.2}
          shadowRadius={12}
          elevation={8}
        >
          <YStack alignItems="center" paddingHorizontal={10} flex={1}>
            <DelayedLottieView
              autoPlay
              loop={shouldLoopAnimation}
              source={animationSource}
              style={{
                width: 60,
                height: 60,
                marginTop: 30,
                marginBottom: 0,
              }}
              resizeMode="cover"
              renderMode="HARDWARE"
            />
            <Text
              color={white}
              fontSize={28}
              fontFamily={advercase}
              textAlign="center"
              letterSpacing={1}
              fontWeight="100"
              marginTop={30}
              marginBottom={20}
            >
              {actionText}
            </Text>

            <XStack gap={4} alignItems="center">
              {renderProgressBars()}
            </XStack>
            <Text
              color={slate400}
              fontSize={13}
              fontFamily={dinot}
              textAlign="center"
              marginTop={12}
              letterSpacing={0.44}
            >
              {actionSubText.toUpperCase()}
            </Text>
            <Text
              color={zinc500}
              fontSize={13}
              fontFamily={dinot}
              textAlign="center"
              marginTop={6}
              letterSpacing={0.44}
            >
              {6 - statusBarProgress} Steps Remaining
            </Text>
          </YStack>
          <YStack width="100%" alignItems="center">
            <YStack width="100%" height={1} backgroundColor="#232329" />
            <YStack
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              width="100%"
              marginTop={18}
            >
              <Text
                color={slate400}
                marginRight={8}
                fontSize={11}
                letterSpacing={0.44}
                fontFamily={dinot}
              >
                ESTIMATED TIME:
              </Text>
              <Text
                color={white}
                fontSize={11}
                letterSpacing={0.44}
                fontFamily={dinot}
              >
                {estimatedTime}
              </Text>
            </YStack>
          </YStack>
        </YStack>
        <YStack
          position="absolute"
          bottom={40}
          left={0}
          right={0}
          alignItems="center"
          justifyContent="center"
        >
          <CloseWarningIcon color={zinc500} height={40} />
          <Text
            color={slate400}
            fontSize={11}
            paddingTop={16}
            letterSpacing={0.44}
            textTransform="uppercase"
            fontFamily={dinot}
            textAlign="center"
          >
            {canCloseApp
              ? 'You can now safely close the app'
              : 'Closing the app will cancel this process'}
          </Text>
        </YStack>
      </YStack>
    </YStack>
  );
};

export default LoadingUI;
