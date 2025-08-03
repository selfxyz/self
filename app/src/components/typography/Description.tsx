// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React from 'react';
import { StyleSheet } from 'react-native';
import type { TextProps } from 'tamagui';
import { Text } from 'tamagui';

import { shouldShowAesopRedesign } from '../../hooks/useAesopRedesign';
import { slate500 } from '../../utils/colors';
import { dinot } from '../../utils/fonts';

interface DescriptionProps extends TextProps {}

const Description = ({ children, style, ...props }: DescriptionProps) => {
  return (
    <Text
      {...props}
      textBreakStrategy="balanced"
      style={[styles.description, style]}
    >
      {children}
    </Text>
  );
};

export default Description;

const styles = StyleSheet.create({
  description: {
    color: slate500,
    fontSize: 18,
    lineHeight: 23,
    textAlign: 'center',
    fontFamily: dinot,
    ...(shouldShowAesopRedesign() && {
      textAlign: 'left',
      fontSize: 16,
    }),
  },
});
