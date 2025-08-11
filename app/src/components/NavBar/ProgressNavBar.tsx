// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TextStyle, ViewStyle } from 'tamagui';
import { XStack, YStack } from 'tamagui';
import type {
  NativeStackHeaderProps,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';

import { NavBar } from '@/components/NavBar/BaseNavBar';
import { cyan300, slate200, white } from '@/utils/colors';
import { buttonTap } from '@/utils/haptic';

interface ProgressNavBarProps extends NativeStackHeaderProps {
  currentStep?: number;
  totalSteps?: number;
}

interface ProgressNavigationOptions extends NativeStackNavigationOptions {
  headerCurrentStep?: number;
  headerTotalSteps?: number;
}

export const ProgressNavBar = (props: NativeStackHeaderProps) => {
  const { goBack, canGoBack } = props.navigation;
  const { options } = props;
  const headerStyle = (options.headerStyle || {}) as ViewStyle;
  const insets = useSafeAreaInsets();

  const progressOptions = options as ProgressNavigationOptions;

  const currentStep =
    progressOptions.headerCurrentStep ||
    (props as ProgressNavBarProps).currentStep ||
    1;

  const totalSteps =
    progressOptions.headerTotalSteps ||
    (props as ProgressNavBarProps).totalSteps ||
    1;

  const segments = Array.from({ length: totalSteps }, (_, index) => index + 1);

  return (
    <YStack>
      <NavBar.Container
        gap={14}
        paddingHorizontal={20}
        paddingTop={Math.max(insets.top, 12)}
        paddingBottom={14}
        backgroundColor={headerStyle.backgroundColor as string}
        barStyle={
          options.headerTintColor === white ||
          (options.headerTitleStyle as TextStyle)?.color === white
            ? 'light'
            : 'dark'
        }
      >
        <XStack width="100%" alignItems="center">
          <XStack width={50} justifyContent="flex-start">
            <NavBar.LeftAction
              component={
                options.headerBackTitle || (canGoBack() ? 'back' : undefined)
              }
              onPress={() => {
                buttonTap();
                goBack();
              }}
              {...(options.headerTitleStyle as ViewStyle)}
            />
          </XStack>

          <XStack flex={1} justifyContent="center" alignItems="center">
            <NavBar.Title {...(options.headerTitleStyle as ViewStyle)}>
              {props.options.title}
            </NavBar.Title>
          </XStack>

          <XStack width={50} />
        </XStack>
      </NavBar.Container>

      <YStack
        backgroundColor={
          (props.options.headerStyle as ViewStyle)?.backgroundColor || white
        }
        paddingHorizontal={20}
        paddingBottom={20}
      >
        <XStack width="100%" height={4} gap={4}>
          {segments.map((step, index) => (
            <YStack
              key={step}
              flex={1}
              height={5}
              backgroundColor={step <= currentStep ? cyan300 : slate200}
              borderRadius={0}
              borderTopLeftRadius={index === 0 ? 4 : 0}
              borderBottomLeftRadius={index === 0 ? 4 : 0}
              borderTopRightRadius={index === segments.length - 1 ? 4 : 0}
              borderBottomRightRadius={index === segments.length - 1 ? 4 : 0}
              overflow="hidden"
            />
          ))}
        </XStack>
      </YStack>
    </YStack>
  );
};
