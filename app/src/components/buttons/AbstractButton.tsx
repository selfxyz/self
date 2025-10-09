// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import React from 'react';
import type {
  GestureResponderEvent,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';
import { Platform, StyleSheet } from 'react-native';
import type { ViewProps } from 'tamagui';
import { Button, Text } from 'tamagui';

import { pressedStyle } from '@/components/buttons/pressedStyle';
import analytics from '@/utils/analytics';
import { dinot } from '@/utils/fonts';

export interface ButtonProps extends ViewProps {
  children: React.ReactNode;
  animatedComponent?: React.ReactNode;
  trackEvent?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}

interface AbstractButtonProps extends ButtonProps {
  bgColor: string;
  borderColor?: string;
  borderWidth?: number;
  color: string;
  onPress?: ((e: GestureResponderEvent) => void) | null | undefined;
}

const { trackEvent: analyticsTrackEvent } = analytics();

/*
    Base Button component that can be used to create different types of buttons
    use PrimaryButton and SecondaryButton instead of this component or create a new button component

    @dev If the button isnt filling the space check that its parent is 100% width
*/
export default function AbstractButton({
  children,
  bgColor,
  color,
  borderColor,
  borderWidth = 4,
  style,
  animatedComponent,
  trackEvent,
  onPress,
  ...props
}: AbstractButtonProps) {
  const hasBorder = borderColor ? true : false;

  const handlePress = (e: GestureResponderEvent) => {
    if (trackEvent) {
      // attempt to remove event category from click event
      const parsedEvent = trackEvent?.split(':')?.[1]?.trim();
      if (parsedEvent) {
        trackEvent = parsedEvent;
      }
      analyticsTrackEvent(`Click: ${trackEvent}`);
    }
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <Button
      unstyled
      {...props}
      onPress={handlePress}
      style={[
        styles.container,
        { backgroundColor: bgColor },
        hasBorder
          ? {
              borderWidth: borderWidth,
              borderColor: borderColor,
              padding: 20 - borderWidth, // Adjust padding to maintain total size
            }
          : Platform.select({ web: { borderWidth: 0 }, default: {} }),
        style as ViewStyle,
      ]}
      pressStyle={!animatedComponent ? pressedStyle : {}}
    >
      {animatedComponent}
      <Text style={[styles.text, { color: color }]}>{children}</Text>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    flexDirection: 'row',
    flexGrow: 0,
    flexShrink: 0,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    rowGap: 12,
    padding: 20,
    borderRadius: 5,
  },
  text: {
    fontFamily: dinot,
    textAlign: 'center',
    fontSize: 18,
  },
});
