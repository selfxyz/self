// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { lazy } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { ProgressNavBar } from '@/components/NavBar';
import { shouldShowAesopRedesign } from '@/hooks/useAesopRedesign';
import { white } from '@/utils/colors';

const DocumentOnboardingScreen = lazy(
  () => import('@/screens/aesop/DocumentOnboardingScreen'),
);

const aesopScreens = {
  DocumentOnboarding: {
    screen: DocumentOnboardingScreen,
    options: {
      animation: 'slide_from_bottom',
      header: ProgressNavBar,
      title: 'Scan your document',
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
