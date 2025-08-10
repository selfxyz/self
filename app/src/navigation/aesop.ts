// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { ProgressNavBar } from '@/components/NavBar';
import { shouldShowAesopRedesign } from '@/hooks/useAesopRedesign';
import { white } from '@/utils/colors';

const PassportOnboardingScreen = lazy(
  () => import('@/screens/aesop/PassportOnboardingScreen'),
);

const aesopScreens = {
  PassportOnboarding: {
    screen: PassportOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Scan your passport',
      headerStyle: {
        backgroundColor: white,
      },
      headerCurrentStep: 1,
      headerTotalSteps: 4,
    } as NativeStackNavigationOptions,
  },
};

export const getAesopScreens = () =>
  shouldShowAesopRedesign() ? aesopScreens : {};
export default getAesopScreens();
