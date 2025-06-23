//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Button, Text, ViewProps } from 'tamagui';

import { shouldShowAesopRedesign } from '../../hooks/useAesopRedesign';
import analytics from '../../utils/analytics';
import { dinot } from '../../utils/fonts';
import { pressedStyle } from './pressedStyle';

export interface ButtonProps extends ViewProps {
  children: React.ReactNode;
  animatedComponent?: React.ReactNode;
  trackEvent?: string;
}

interface AbstractButtonProps extends ButtonProps {
  bgColor: string;
  borderColor?: string;
  color: string;
  onPress?: ((e: any) => void) | null | undefined;
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
  style,
  animatedComponent,
  trackEvent,
  onPress,
  ...props
}: AbstractButtonProps) {
  const hasBorder = borderColor ? true : false;

  const handlePress = (e: any) => {
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
        { backgroundColor: bgColor, borderColor: borderColor },
        hasBorder ? styles.withBorder : {},
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
    width: shouldShowAesopRedesign() ? '48%' : '100%',
    display: 'flex',
    alignItems: 'center',
    rowGap: 12,
    padding: 20,
    borderRadius: 5,
  },
  withBorder: {
    borderWidth: 4,
    padding: 16, // plus 4 of border = 20
  },
  text: {
    fontFamily: dinot,
    textAlign: 'center',
    fontSize: 18,
  },
});
