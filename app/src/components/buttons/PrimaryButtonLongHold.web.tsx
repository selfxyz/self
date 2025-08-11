// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import React, { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
// Tamagui imports for web
import { AnimatePresence, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import type { HeldPrimaryButtonProps } from '@/components/buttons/PrimaryButtonLongHold.shared';
import {
  ACTION_TIMER,
  COLORS,
} from '@/components/buttons/PrimaryButtonLongHold.shared';

export function HeldPrimaryButton({
  children,
  onLongPress,
  ...props
}: HeldPrimaryButtonProps) {
  const [hasTriggered, setHasTriggered] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isPressed, setIsPressed] = useState(false);

  const onPressIn = () => {
    setHasTriggered(false);
    setIsPressed(true);
  };

  const onPressOut = () => {
    setIsPressed(false);
  };

  const getButtonSize = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width - 1;
    const height = e.nativeEvent.layout.height - 1;
    setSize({ width, height });
  };

  useEffect(() => {
    // Web: Use setTimeout to trigger onLongPress
    let timeoutId: NodeJS.Timeout;
    if (isPressed && !hasTriggered) {
      timeoutId = setTimeout(() => {
        if (isPressed && !hasTriggered) {
          setHasTriggered(true);
          onLongPress();
        }
      }, ACTION_TIMER);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [hasTriggered, onLongPress, isPressed]);

  const renderAnimatedComponent = () => {
    // Web: Use Tamagui AnimatePresence with CSS transitions
    return (
      <AnimatePresence>
        {isPressed && (
          <YStack
            key="fill"
            position="absolute"
            top={0}
            left={0}
            bottom={0}
            borderRadius={4}
            backgroundColor={COLORS[1]}
            width="100%"
            height={size.height}
            enterStyle={{ width: 0 }}
            exitStyle={{ width: 0 }}
            animation="quick"
          />
        )}
      </AnimatePresence>
    );
  };

  return (
    <PrimaryButton
      {...props}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      // @ts-expect-error actually it is there
      onLayout={getButtonSize}
      animatedComponent={renderAnimatedComponent()}
    >
      {children}
    </PrimaryButton>
  );
}
