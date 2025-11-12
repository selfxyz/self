// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import { Button, Text, View } from '@selfxyz/mobile-sdk-alpha/components';
import {
  black,
  charcoal,
  slate50,
} from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { NavBar } from '@/components/navbar/BaseNavBar';
import { buttonTap } from '@/integrations/haptics';
import { extraYPadding } from '@/utils/styleUtils';

export const IdDetailsNavBar = (props: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const backButtonWidth = 50; // Adjusted for text

  return (
    <NavBar.Container
      backgroundColor={slate50}
      barStyle={'dark'}
      justifyContent="space-between"
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
    >
      <NavBar.LeftAction
        component={
          <Button
            unstyled
            marginLeft={'$3.5'}
            padding={'$3'}
            width={104}
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
      <NavBar.Title style={{ fontSize: 24, color: black }}>
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
