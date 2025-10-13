// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Animated } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import type { HeldPrimaryButtonProps } from './PrimaryButtonLongHold.shared';
import { ACTION_TIMER, COLORS } from './PrimaryButtonLongHold.shared';

export function HeldPrimaryButton({ children, onLongPress, ...props }: HeldPrimaryButtonProps) {
  const [hasTriggered, setHasTriggered] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isPressed, setIsPressed] = useState(false);
  const animationValueRef = useRef(new Animated.Value(0));
  const animationValue = animationValueRef.current;

  const onPressIn = () => {
    setHasTriggered(false);
    setIsPressed(true);
    Animated.timing(animationValue, {
      toValue: 1,
      duration: ACTION_TIMER,
      useNativeDriver: false,
    }).start();
  };

  const onPressOut = () => {
    setIsPressed(false);
    if (!hasTriggered) {
      Animated.timing(animationValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const getButtonSize = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width - 1;
    const height = e.nativeEvent.layout.height - 1;
    setSize({ width, height });
  };

  useEffect(() => {
    // Use animation listener to trigger onLongPress
    const listener = animationValue.addListener(({ value }) => {
      if (value >= 0.95 && !hasTriggered && isPressed) {
        setHasTriggered(true);
        onLongPress();
      }
    });
    return () => {
      animationValue.removeListener(listener);
    };
  }, [animationValue, hasTriggered, onLongPress, isPressed]);

  const renderAnimatedComponent = () => {
    // Use React Native Animated.View for consistent behavior
    const width = animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, size.width],
    });

    return (
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          borderRadius: 4,
          backgroundColor: COLORS[1],
          width: width,
          height: size.height,
        }}
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
