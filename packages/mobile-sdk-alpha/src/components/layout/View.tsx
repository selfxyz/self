// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import type { DimensionValue, PressableProps, ViewProps as RNViewProps, ViewStyle } from 'react-native';
import { Pressable, View as RNView } from 'react-native';

interface SpacingProps {
  padding?: string | number;
  paddingTop?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  paddingRight?: string | number;
  paddingHorizontal?: string | number;
  paddingVertical?: string | number;
  margin?: string | number;
  marginTop?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  marginRight?: string | number;
  marginHorizontal?: string | number;
  marginVertical?: string | number;
}

interface LayoutProps {
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  width?: DimensionValue;
  height?: DimensionValue;
  flexDirection?: ViewStyle['flexDirection'];
  justifyContent?: ViewStyle['justifyContent'];
  alignItems?: ViewStyle['alignItems'];
  alignSelf?: ViewStyle['alignSelf'];
  backgroundColor?: string;
  borderRadius?: string | number;
  borderWidth?: number;
  borderColor?: string;
  elevation?: number;
  gap?: string | number;
}

interface CustomHitSlop {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface PressableViewProps {
  onPress?: PressableProps['onPress'];
  pressStyle?: ViewStyle;
  hitSlop?: CustomHitSlop | number;
  disabled?: boolean;
}

export interface ViewProps extends Omit<RNViewProps, 'hitSlop'>, SpacingProps, LayoutProps, PressableViewProps {}

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

const convertBorderRadius = (value: string | number | undefined): number | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;

  // Handle tamagui radius tokens like '$2', '$5'
  if (typeof value === 'string') {
    if (value.startsWith('$')) {
      const numValue = parseFloat(value.slice(1));
      return numValue * 4; // Convert to actual pixels (approximate tamagui radius)
    }
    return parseFloat(value) || 0;
  }

  return 0;
};

export const View: React.FC<ViewProps> = ({
  children,
  style,
  padding,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  paddingHorizontal,
  paddingVertical,
  margin,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  marginHorizontal,
  marginVertical,
  flex,
  flexGrow,
  flexShrink,
  width,
  height,
  flexDirection,
  justifyContent,
  alignItems,
  alignSelf,
  backgroundColor,
  borderRadius,
  borderWidth,
  borderColor,
  elevation,
  gap,
  onPress,
  disabled,
  pressStyle,
  hitSlop,
  ...props
}) => {
  const viewStyle: ViewStyle = {
    ...(flex !== undefined && { flex }),
    ...(flexGrow !== undefined && { flexGrow }),
    ...(flexShrink !== undefined && { flexShrink }),
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
    ...(flexDirection && { flexDirection }),
    ...(justifyContent && { justifyContent }),
    ...(alignItems && { alignItems }),
    ...(alignSelf && { alignSelf }),
    ...(backgroundColor && { backgroundColor }),
    ...(borderRadius !== undefined && { borderRadius: convertBorderRadius(borderRadius) }),
    ...(borderWidth !== undefined && { borderWidth }),
    ...(borderColor && { borderColor }),
    ...(elevation !== undefined && { elevation }),
    ...(gap !== undefined && {
      gap: convertSpacingValue(gap),
    }),

    // Handle spacing
    ...(padding !== undefined && { padding: convertSpacingValue(padding) }),
    ...(paddingTop !== undefined && { paddingTop: convertSpacingValue(paddingTop) }),
    ...(paddingBottom !== undefined && { paddingBottom: convertSpacingValue(paddingBottom) }),
    ...(paddingLeft !== undefined && { paddingLeft: convertSpacingValue(paddingLeft) }),
    ...(paddingRight !== undefined && { paddingRight: convertSpacingValue(paddingRight) }),
    ...(paddingHorizontal !== undefined && {
      paddingLeft: convertSpacingValue(paddingHorizontal),
      paddingRight: convertSpacingValue(paddingHorizontal),
    }),
    ...(paddingVertical !== undefined && {
      paddingTop: convertSpacingValue(paddingVertical),
      paddingBottom: convertSpacingValue(paddingVertical),
    }),
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

  if (onPress) {
    // Convert numeric hitSlop to proper format
    const processedHitSlop =
      typeof hitSlop === 'number' ? { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop } : hitSlop;

    return (
      <Pressable
        {...(props as PressableProps)}
        onPress={onPress}
        hitSlop={processedHitSlop}
        disabled={disabled}
        style={({ pressed }) => [viewStyle, pressed && pressStyle, style]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <RNView {...props} style={[viewStyle, style]}>
      {children}
    </RNView>
  );
};
