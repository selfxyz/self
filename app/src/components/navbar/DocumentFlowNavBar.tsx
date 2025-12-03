// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { HelpCircle } from '@tamagui/lucide-icons';

import { slate100 } from '@selfxyz/mobile-sdk-alpha/constants/colors';
import { dinot } from '@selfxyz/mobile-sdk-alpha/constants/fonts';

import { NavBar } from '@/components/navbar/BaseNavBar';

export const DocumentFlowNavBar = ({
  title,
  titleFontFamily = dinot,
  fontSize = 17,
}: {
  title: string;
  titleFontFamily?: string;
  fontSize?: number;
}) => {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();

  return (
    <NavBar.Container
      paddingTop={top}
      backgroundColor={slate100}
      paddingHorizontal="$4"
      alignItems="center"
      justifyContent="space-between"
    >
      <NavBar.LeftAction component="back" onPress={() => navigation.goBack()} />
      <NavBar.Title style={{ fontFamily: titleFontFamily, fontSize: fontSize }}>
        {title}
      </NavBar.Title>
      <NavBar.RightAction
        component={<HelpCircle color={'transparent'} />}
        onPress={() => {
          /* Handle help action, button is transparent for now as we dont have the help screen ready */
        }}
      />
    </NavBar.Container>
  );
};
