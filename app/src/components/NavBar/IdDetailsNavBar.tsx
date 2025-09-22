// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, View } from 'tamagui';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import { NavBar } from '@/components/NavBar/BaseNavBar';
import { black, charcoal, slate50 } from '@/utils/colors';
import { extraYPadding } from '@/utils/constants';
import { buttonTap } from '@/utils/haptic';

export const IdDetailsNavBar = (props: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const backButtonWidth = 50; // Adjusted for text

  return (
    <NavBar.Container
      backgroundColor={slate50}
      barStyle={'light'}
      justifyContent="space-between"
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
    >
      <NavBar.LeftAction
        component={
          <Button
            unstyled
            marginLeft={'$3.5'}
            padding={'$3'}
            width={'$10'}
            onPress={() => {
              buttonTap();
              props.navigation.goBack();
            }}
          >
            <Text color={charcoal} fontSize={17} fontWeight="bold">
              Done
            </Text>
          </Button>
        }
      />
      <NavBar.Title size="large" color={black}>
        {props.options.title}
      </NavBar.Title>
      <NavBar.RightAction
        component={
          // Spacer to balance the back button and center the title
          <View style={{ width: backButtonWidth }} />
        }
      />
    </NavBar.Container>
  );
};
