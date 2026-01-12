// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect } from 'react';
import type {
  AnimatableNumericValue,
  DimensionValue,
  PressableProps,
  ViewProps as RNViewProps,
  ViewStyle,
} from 'react-native';
import { Animated, Pressable, View as RNView } from 'react-native';

type DimensionValueWithToken = DimensionValue | `$${string}`;

interface SpacingProps {
  padding?: DimensionValueWithToken;
  paddingTop?: DimensionValueWithToken;
  paddingBottom?: DimensionValueWithToken;
  paddingLeft?: DimensionValueWithToken;
  paddingRight?: DimensionValueWithToken;
  paddingHorizontal?: DimensionValueWithToken;
  paddingVertical?: DimensionValueWithToken;
  margin?: DimensionValueWithToken;
  marginTop?: DimensionValueWithToken;
  marginBottom?: DimensionValueWithToken;
  marginLeft?: DimensionValueWithToken;
  marginRight?: DimensionValueWithToken;
  marginHorizontal?: DimensionValueWithToken;
  marginVertical?: DimensionValueWithToken;
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

export interface ViewProps
  extends Omit<RNViewProps, 'hitSlop'>, SpacingProps, Omit<ViewStyle, keyof SpacingProps>, PressableViewProps {}

const sizeTokens: Record<string, number> = {
  $0: 0,
  '$0.25': 2,
  '$0.5': 4,
  '$0.75': 8,
  $1: 20,
  '$1.5': 24,
  $2: 28,
  '$2.5': 32,
  $3: 36,
  '$3.5': 40,
  $4: 44,
  $true: 44,
  '$4.5': 48,
  $5: 52,
  $6: 64,
  $7: 74,
  $8: 84,
  $9: 94,
  $10: 104,
  $11: 124,
  $12: 144,
  $13: 164,
  $14: 184,
  $15: 204,
  $16: 224,
  $17: 224,
  $18: 244,
  $19: 264,
  $20: 284,
};
const radiusTokens: Record<string, number> = {
  $0: 0,
  $1: 3,
  $2: 5,
  $3: 7,
  $4: 9,
  $true: 9,
  $5: 10,
  $6: 16,
  $7: 19,
  $8: 22,
  $9: 26,
  $10: 34,
  $11: 42,
  $12: 50,
};

// Tamagui sizeToSpace function (from utils.ts)
function sizeToSpace(v: number): number {
  if (v === 0) return 0;
  if (v === 2) return 0.5;
  if (v === 4) return 1;
  if (v === 8) return 1.5;
  if (v <= 16) return Math.round(v * 0.333);
  return Math.floor(v * 0.7 - 12);
}

// Calculate space tokens from size tokens
const spaceTokens: Record<string, number> = {};
Object.entries(sizeTokens).forEach(([key, sizeValue]) => {
  spaceTokens[key] = sizeToSpace(sizeValue);
});

const convertSpacingValue = (value: DimensionValueWithToken): DimensionValue | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;

  // Handle tamagui spacing tokens
  if (typeof value === 'string') {
    if (value.startsWith('$') && spaceTokens[value] !== undefined) {
      return spaceTokens[value];
    }
    // Pass through percentage strings and other valid CSS values
    if (value.includes('%') || value === 'auto') {
      return value as DimensionValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? (value as DimensionValue) : parsed;
  }

  return value as DimensionValue;
};

const convertBorderRadius = (
  value: AnimatableNumericValue | string | undefined,
): AnimatableNumericValue | undefined => {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;

  // Handle tamagui radius tokens
  if (typeof value === 'string') {
    if (value.startsWith('$') && radiusTokens[value] !== undefined) {
      return radiusTokens[value];
    }
    return parseFloat(value) || 0;
  }

  if (typeof value === 'object' && value instanceof Animated.AnimatedNode) {
    return value;
  }

  return 0;
};

const convertGapValue = (value: string | number | undefined): string | number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;

  // Handle tamagui spacing tokens
  if (typeof value === 'string') {
    if (value.startsWith('$') && spaceTokens[value] !== undefined) {
      return spaceTokens[value];
    }
    // Pass through percentage strings for gap
    if (value.includes('%')) {
      return value;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
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
  maxWidth,
  height,
  flexDirection,
  justifyContent,
  alignItems,
  alignSelf,
  backgroundColor,
  borderRadius,
  borderWidth,
  borderBottomWidth,
  borderBottomColor,
  borderTopColor,
  borderTopWidth,
  borderLeftWidth,
  borderRightWidth,
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
    ...(maxWidth !== undefined && { maxWidth }),
    ...(height !== undefined && { height }),
    ...(flexDirection && { flexDirection }),
    ...(justifyContent && { justifyContent }),
    ...(alignItems && { alignItems }),
    ...(alignSelf && { alignSelf }),
    ...(backgroundColor && { backgroundColor }),
    ...(borderRadius !== undefined && { borderRadius: convertBorderRadius(borderRadius) }),
    ...(borderBottomWidth !== undefined && { borderBottomWidth }),
    ...(borderTopWidth !== undefined && { borderTopWidth }),
    ...(borderLeftWidth !== undefined && { borderLeftWidth }),
    ...(borderRightWidth !== undefined && { borderRightWidth }),
    ...(borderWidth !== undefined && { borderWidth }),
    ...(borderColor && { borderColor }),
    ...(borderBottomColor && { borderBottomColor }),
    ...(borderTopColor && { borderTopColor }),
    ...(elevation !== undefined && { elevation }),
    ...(gap !== undefined && {
      gap: convertGapValue(gap),
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
  useEffect(() => {
    if (Object.keys(props).length > 0) {
      console.debug('other props not handled:', props);
    }
  }, [Object.keys(props).length]);

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
        style={({ pressed }) => [viewStyle, style, pressed && pressStyle]}
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
