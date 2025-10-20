// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import type { GestureResponderEvent, LayoutChangeEvent, PressableProps, ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { dinot } from '../../constants/fonts';
import { useSelfClient } from '../../context';
import { pressedStyle } from './pressedStyle';

export interface ButtonProps extends PressableProps {
  children: React.ReactNode;
  animatedComponent?: React.ReactNode;
  trackEvent?: string;
  borderWidth?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}

interface AbstractButtonProps extends ButtonProps {
  bgColor: string;
  borderColor?: string;
  borderWidth?: number;
  color: string;
}

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
  const selfClient = useSelfClient();
  const hasBorder = borderColor ? true : false;

  const handlePress = (e: GestureResponderEvent) => {
    if (trackEvent) {
      // attempt to remove event category from click event
      const parsedEvent = trackEvent?.split(':')?.[1]?.trim();
      if (parsedEvent) {
        trackEvent = parsedEvent;
      }
      selfClient.trackEvent(`Click: ${trackEvent}`);
    }
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: bgColor },
        hasBorder
          ? {
              borderWidth: borderWidth,
              borderColor: borderColor,
              padding: 20 - borderWidth, // Adjust padding to maintain total size
            }
          : Platform.select({ web: { borderWidth: 0 }, default: {} }),
        !animatedComponent && pressed ? pressedStyle : {},
        style as ViewStyle,
      ]}
    >
      {animatedComponent}
      <Text style={[styles.text, { color: color }]}>{children}</Text>
    </Pressable>
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
