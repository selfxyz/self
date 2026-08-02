// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { ChevronLeft, HelpCircle } from '@tamagui/lucide-icons';

import { Button, XStack, YStack } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  cyan300,
  slate100,
  slate300,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { NavBar } from '@/components/navbar/BaseNavBar';
import { buttonTap } from '@/integrations/haptics';
import { extraYPadding } from '@/utils/styleUtils';

export const AadhaarNavBar = (props: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();

  const currentRouteName = props.route.name;
  // Aadhaar registration is a 3-step flow: instructions (download the app),
  // select the unmasked version, then enter the PDF password. Success/error
  // screens fall through to the final step.
  const totalSteps = 3;
  const currentStep =
    currentRouteName === 'AadhaarUpload'
      ? 1
      : currentRouteName === 'AadhaarSelectVersion'
        ? 2
        : currentRouteName === 'AadhaarPdfPassword'
          ? 3
          : totalSteps;

  const handleClose = () => {
    buttonTap();
    props.navigation.goBack();
  };

  const handleHelp = () => {
    buttonTap();
    // Handle help action - could open a modal or navigate to help screen
    console.log('Help pressed');
  };

  return (
    <YStack backgroundColor={slate100}>
      <NavBar.Container
        backgroundColor={slate100}
        barStyle={'dark'}
        padding={20}
        justifyContent="space-between"
        paddingTop={Math.max(insets.top, 15) + extraYPadding}
        paddingBottom={10}
        borderBottomWidth={0}
        borderBottomColor="transparent"
      >
        <NavBar.LeftAction
          component={
            <Button
              unstyled
              onPress={handleClose}
              padding={8}
              borderRadius={20}
              hitSlop={10}
            >
              <ChevronLeft size={24} color={black} />
            </Button>
          }
        />

        <NavBar.Title
          style={{
            fontSize: 16,
            color: black,
            fontWeight: '600',
            fontFamily: dinot,
          }}
        >
          AADHAAR REGISTRATION
        </NavBar.Title>

        <NavBar.RightAction
          component={
            <Button
              unstyled
              onPress={handleHelp}
              padding={8}
              borderRadius={20}
              hitSlop={10}
              width={32}
              height={32}
              justifyContent="center"
              alignItems="center"
            >
              <HelpCircle size={20} color={black} opacity={0} />
            </Button>
          }
        />
      </NavBar.Container>

      {/* Progress Bar - dynamic based on current step */}
      <YStack
        paddingHorizontal={20}
        paddingBottom={15}
        backgroundColor={slate100}
      >
        <XStack gap={8}>
          {Array.from({ length: totalSteps }, (_, index) => (
            <YStack
              key={index}
              flex={1}
              height={4}
              backgroundColor={index < currentStep ? cyan300 : slate300}
              borderRadius={2}
            />
          ))}
        </XStack>
      </YStack>
    </YStack>
  );
};
