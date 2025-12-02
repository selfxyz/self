// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import type { TextProps as RNTextProps, TextStyle } from 'react-native';
import { Text as RNText } from 'react-native';

interface SpacingProps {
  margin?: string | number;
  marginTop?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  marginRight?: string | number;
  marginHorizontal?: string | number;
  marginVertical?: string | number;
}

interface TextStyleProps {
  color?: string;
  fontSize?: number;
  fontWeight?: TextStyle['fontWeight'];
  textAlign?: TextStyle['textAlign'];
  fontFamily?: string;
}

interface TextProps extends RNTextProps, SpacingProps, TextStyleProps {}

const convertSpacingValue = (value: string | number | undefined): number | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;

  // Handle tamagui spacing tokens like '$4', '$2.5'
  if (typeof value === 'string') {
    if (value.startsWith('$')) {
      const numValue = parseFloat(value.slice(1));
      return numValue * 8; // Convert to actual pixels (approximate tamagui spacing)
    }
    return parseFloat(value) || 0;
  }

  return 0;
};

export const Text: React.FC<TextProps> = ({
  children,
  style,
  margin,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  marginHorizontal,
  marginVertical,
  color,
  fontSize,
  fontWeight,
  textAlign,
  fontFamily,
  ...props
}) => {
  const textStyle: TextStyle = {
    ...(color && { color }),
    ...(fontSize !== undefined && { fontSize }),
    ...(fontWeight && { fontWeight }),
    ...(textAlign && { textAlign }),
    ...(fontFamily && { fontFamily }),

    // Handle spacing
    ...(margin !== undefined && { margin: convertSpacingValue(margin) }),
    ...(marginTop !== undefined && { marginTop: convertSpacingValue(marginTop) }),
    ...(marginBottom !== undefined && { marginBottom: convertSpacingValue(marginBottom) }),
    ...(marginLeft !== undefined && { marginLeft: convertSpacingValue(marginLeft) }),
    ...(marginRight !== undefined && { marginRight: convertSpacingValue(marginRight) }),
    ...(marginHorizontal !== undefined && {
      marginLeft: convertSpacingValue(marginHorizontal),
      marginRight: convertSpacingValue(marginHorizontal),
    }),
    ...(marginVertical !== undefined && {
      marginTop: convertSpacingValue(marginVertical),
      marginBottom: convertSpacingValue(marginVertical),
    }),
  };

  return (
    <RNText {...props} style={[textStyle, style]}>
      {children}
    </RNText>
  );
};
