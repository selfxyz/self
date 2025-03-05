import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  ColorValue,
  LayoutChangeEvent,
  StyleSheet,
  useAnimatedValue,
  ViewStyle,
} from 'react-native';

import { ButtonProps } from './AbstractButton';
import { PrimaryButton } from './PrimaryButton';

type RGBA = `rgba(${number}, ${number}, ${number}, ${number})`;

const ACTION_TIMER = 1000; // time in ms
//slate400 to slate800 but in rgb
const COLORS: RGBA[] = ['rgba(30, 41, 59, 0.3)', 'rgba(30, 41, 59, 1)'];

export function HeldPrimaryButton({
  children,
  onPress,
  ...props
}: Readonly<ButtonProps>): JSX.Element {
  const animation = useAnimatedValue(0);
  const [hasTriggered, setHasTriggered] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onPressIn = useCallback((): void => {
    setHasTriggered(false);
    Animated.timing(animation, {
      toValue: 1,
      duration: ACTION_TIMER,
      useNativeDriver: true,
    }).start();
  }, [animation]);

  const onPressOut = useCallback((): void => {
    setHasTriggered(false);
    Animated.timing(animation, {
      toValue: 0,
      duration: ACTION_TIMER,
      useNativeDriver: true,
    }).start();
  }, [animation]);

  const getButtonSize = useCallback((e: LayoutChangeEvent): void => {
    const width = e.nativeEvent.layout.width - 1;
    const height = e.nativeEvent.layout.height - 1;
    setSize({ width, height });
  }, []);

  const getProgressStyles = useCallback((): ViewStyle => {
    const scaleX = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const bgColor = animation.interpolate({
      inputRange: [0, 1],
      outputRange: COLORS,
    }) as unknown as ColorValue;
    return {
      transform: [{ scaleX }],
      backgroundColor: bgColor,
      height: size.height,
    };
  }, [animation, size.height]);

  useEffect(() => {
    const animationListener = animation.addListener(({ value }): void => {
      if (value >= 0.95 && !hasTriggered) {
        setHasTriggered(true);
        if (onPress) {
          onPress();
        }
      }
    });

    return (): void => {
      animation.removeListener(animationListener);
    };
  }, [animation, hasTriggered, onPress]);

  const animatedStyles = useMemo(
    () => [styles.fill, size, getProgressStyles()],
    [size, getProgressStyles],
  );

  const animatedView = useMemo(
    (): JSX.Element => <Animated.View style={animatedStyles} />,
    [animatedStyles],
  );

  return (
    <PrimaryButton
      {...props}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      // @ts-expect-error actually it is there
      onLayout={getButtonSize}
      animatedComponent={animatedView}
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
