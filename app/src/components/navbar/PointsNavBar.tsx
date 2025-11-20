// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import { Text, View } from '@selfxyz/mobile-sdk-alpha/components';
import { black, slate50 } from '@selfxyz/mobile-sdk-alpha/constants/colors';

import { NavBar } from '@/components/navbar/BaseNavBar';
import { buttonTap } from '@/integrations/haptics';
import { extraYPadding } from '@/utils/styleUtils';

export const PointsNavBar = (props: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const closeButtonWidth = 50;

  return (
    <NavBar.Container
      backgroundColor={slate50}
      barStyle={'dark'}
      justifyContent="space-between"
      paddingTop={Math.max(insets.top, 15) + extraYPadding}
      paddingBottom={10}
      paddingHorizontal={20}
    >
      <NavBar.LeftAction
        component="close"
        color={black}
        onPress={() => {
          buttonTap();
          props.navigation.navigate('Home');
        }}
      />
      <View flex={1} alignItems="center" justifyContent="center">
        <Text
          color={black}
          fontSize={15}
          fontWeight="500"
          fontFamily="DIN OT"
          textAlign="center"
          style={{
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}
        >
          Self Points
        </Text>
      </View>
      <NavBar.RightAction
        component={
          // Spacer to balance the close button and center the title
          <View style={{ width: closeButtonWidth }} />
        }
      />
    </NavBar.Container>
  );
};
