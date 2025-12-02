// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useMemo } from 'react';
import type { StyleProp, TextProps, TextStyle } from 'react-native';
import { StyleSheet, Text } from 'react-native';

import { black } from '../../constants/colors';
import { advercase } from '../../constants/fonts';

type TitleProps = TextProps & {
  size?: 'large';
  style?: StyleProp<TextStyle>;
};

export const Title: React.FC<TitleProps> = ({ size, style, children, ...rest }) => {
  const baseStyle: TextStyle = {
    fontSize: 28,
    lineHeight: 35,
    fontFamily: advercase,
    color: black,
  };

  const largeStyle: TextStyle =
    size === 'large'
      ? {
          fontSize: 38,
          lineHeight: 47,
        }
      : {};

  const flattenedStyle = useMemo(() => StyleSheet.flatten([baseStyle, largeStyle, style]), [size, style]);

  return (
    <Text style={flattenedStyle} {...rest}>
      {children}
    </Text>
  );
};
