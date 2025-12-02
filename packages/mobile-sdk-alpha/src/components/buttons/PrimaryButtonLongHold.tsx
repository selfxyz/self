// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Animated, StyleSheet, useAnimatedValue } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import type { HeldPrimaryButtonProps } from './PrimaryButtonLongHold.shared';
import { ACTION_TIMER, COLORS } from './PrimaryButtonLongHold.shared';

export function HeldPrimaryButton({ children, onLongPress, ...props }: HeldPrimaryButtonProps) {
  const [hasTriggered, setHasTriggered] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // React Native animation setup
  const animation = useAnimatedValue(0);

  const onPressIn = () => {
    setHasTriggered(false);
    Animated.timing(animation, {
      toValue: 1,
      duration: ACTION_TIMER,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    if (!hasTriggered) {
      Animated.timing(animation, {
        toValue: 0,
        duration: ACTION_TIMER,
        useNativeDriver: true,
      }).start();
    }
  };

  const getButtonSize = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width - 1;
    const height = e.nativeEvent.layout.height - 1;
    setSize({ width, height });
  };

  useEffect(() => {
    // Mobile: Use React Native animation listener
    animation.addListener(({ value }) => {
      if (value >= 0.95 && !hasTriggered) {
        setHasTriggered(true);
        onLongPress();
      }
    });
    return () => {
      animation.removeAllListeners();
    };
  }, [animation, hasTriggered, onLongPress]);

  const renderAnimatedComponent = () => {
    // Mobile: Use React Native Animated.View
    const scaleX = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const bgColor = animation.interpolate({
      inputRange: [0, 1],
      outputRange: COLORS,
    });

    return (
      <Animated.View
        style={[
          styles.fill,
          size,
          {
            transform: [{ scaleX }],
            backgroundColor: bgColor,
            height: size.height,
          },
        ]}
      />
    );
  };

  return (
    <PrimaryButton
      {...props}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLayout={getButtonSize}
      animatedComponent={renderAnimatedComponent()}
    >
      {children}
    </PrimaryButton>
  );
}

const styles = StyleSheet.create({
  fill: {
    transformOrigin: 'left',
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 4,
  },
});
