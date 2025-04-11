import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  NativeStackHeaderProps,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { Progress, TextStyle, ViewStyle, XStack, YStack } from 'tamagui';

import { slate100, slate300, white } from '../../utils/colors';
import { buttonTap } from '../../utils/haptic';
import { NavBar } from './BaseNavBar';

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

  const progressValue = (currentStep / totalSteps) * 100;

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
            ? 'light-content'
            : 'dark-content'
        }
      >
        <XStack width="100%" alignItems="center" justifyContent="space-between">
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

          <XStack flex={1} justifyContent="center">
            <NavBar.Title {...(options.headerTitleStyle as ViewStyle)}>
              {props.options.title}
            </NavBar.Title>
          </XStack>

          <XStack width={30} />
        </XStack>
      </NavBar.Container>

      <YStack
        backgroundColor={slate100}
        paddingHorizontal={20}
        paddingBottom={16}
      >
        <Progress
          size="$2"
          value={progressValue}
          backgroundColor={slate300}
          borderRadius={4}
          overflow="hidden"
          width="100%"
          height={4}
        >
          <Progress.Indicator backgroundColor="#00A3FF" animation="bouncy" />
        </Progress>
      </YStack>
    </YStack>
  );
};
