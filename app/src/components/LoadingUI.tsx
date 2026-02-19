// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
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
import { useResponsiveScale } from '@/hooks/useResponsiveScale';
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
  const s = useResponsiveScale();

  const renderProgressBars = () => {
    const bars = [];
    for (let i = 0; i < 3; i++) {
      bars.push(
        <View
          key={`bar-${i}`}
          width={s(35)}
          height={s(6)}
          borderRadius={s(100)}
          backgroundColor={i < statusBarProgress ? cyan300 : slate600}
          borderWidth={1}
          borderColor={i < statusBarProgress ? cyan300 : slate600}
        />,
      );
    }
    bars.push(
      <View key="plus" marginHorizontal={s(8)}>
        <Plus color={slate600} height={s(14)} width={s(14)} />
      </View>,
    );
    for (let i = 3; i < 6; i++) {
      bars.push(
        <View
          key={`bar-${i}`}
          width={s(35)}
          height={s(6)}
          borderRadius={s(100)}
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
      gap={s(20)}
      justifyContent="space-between"
      flex={1}
      paddingBottom={bottom + extraYPadding}
    >
      <YStack
        flex={1}
        paddingHorizontal={s(15)}
        position="relative"
        backgroundColor={black}
        justifyContent="center"
        alignItems="center"
      >
        <YStack
          width="100%"
          height={s(380)}
          borderRadius={s(16)}
          paddingVertical={s(20)}
          alignItems="center"
          backgroundColor={zinc900}
          shadowColor={black}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.2}
          shadowRadius={s(12)}
          elevation={8}
        >
          <YStack alignItems="center" paddingHorizontal={s(10)} flex={1}>
            <DelayedLottieView
              autoPlay
              loop={shouldLoopAnimation}
              source={animationSource}
              style={{
                width: s(60),
                height: s(60),
                marginTop: s(30),
                marginBottom: 0,
              }}
              resizeMode="cover"
              renderMode="HARDWARE"
            />
            <Text
              color={white}
              fontSize={s(28)}
              fontFamily={advercase}
              textAlign="center"
              letterSpacing={s(1)}
              fontWeight="100"
              marginTop={s(30)}
              marginBottom={s(20)}
            >
              {actionText}
            </Text>

            <XStack gap={s(4)} alignItems="center">
              {renderProgressBars()}
            </XStack>
            <Text
              color={slate400}
              fontSize={s(13)}
              fontFamily={dinot}
              textAlign="center"
              marginTop={s(12)}
              letterSpacing={s(0.44)}
            >
              {actionSubText.toUpperCase()}
            </Text>
            <Text
              color={zinc500}
              fontSize={s(13)}
              fontFamily={dinot}
              textAlign="center"
              marginTop={s(6)}
              letterSpacing={s(0.44)}
            >
              {6 - statusBarProgress} Steps Remaining
            </Text>
          </YStack>
          <YStack width="100%" alignItems="center">
            <YStack width="100%" height={s(1)} backgroundColor="#232329" />
            <YStack
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              width="100%"
              marginTop={s(18)}
            >
              <Text
                color={slate400}
                marginRight={s(8)}
                fontSize={s(11)}
                letterSpacing={s(0.44)}
                fontFamily={dinot}
              >
                ESTIMATED TIME:
              </Text>
              <Text
                color={white}
                fontSize={s(11)}
                letterSpacing={s(0.44)}
                fontFamily={dinot}
              >
                {estimatedTime}
              </Text>
            </YStack>
          </YStack>
        </YStack>
        <YStack
          position="absolute"
          bottom={s(40)}
          left={0}
          right={0}
          alignItems="center"
          justifyContent="center"
        >
          <CloseWarningIcon color={zinc500} height={s(40)} />
          <Text
            color={slate400}
            fontSize={s(11)}
            paddingTop={s(16)}
            letterSpacing={s(0.44)}
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
