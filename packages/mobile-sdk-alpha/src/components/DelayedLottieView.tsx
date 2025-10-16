// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { LottieViewProps } from 'lottie-react-native';
import LottieView from 'lottie-react-native';
import type React from 'react';
import { forwardRef, useEffect, useRef } from 'react';

/**
 * Wrapper around LottieView that fixes iOS native module initialization timing.
 *
 * On iOS, the Lottie native module isn't always fully initialized when components
 * first render during app startup. This causes animations to not appear until
 * after navigating to another screen that triggers native module initialization.
 *
 * This component adds a 100ms delay before starting autoPlay animations, giving
 * the native module time to initialize properly.
 *
 * Usage: Drop-in replacement for LottieView
 * @example
 * <DelayedLottieView autoPlay loop source={animation} style={styles.animation} />
 */
export const DelayedLottieView = forwardRef<LottieView, LottieViewProps>((props, forwardedRef) => {
  // If LottieView is undefined (peer dependency not installed), return null
  if (typeof LottieView === 'undefined') {
    return null;
  }

  const internalRef = useRef<LottieView>(null);
  const ref = (forwardedRef as React.RefObject<LottieView>) || internalRef;

  useEffect(() => {
    // Only auto-trigger for autoPlay animations
    if (props.autoPlay) {
      const timer = setTimeout(() => {
        ref.current?.play();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [props.autoPlay, ref]);

  // For autoPlay animations, disable native autoPlay and control it ourselves
  const modifiedProps = props.autoPlay ? { ...props, autoPlay: false } : props;

  return <LottieView ref={ref} {...modifiedProps} />;
});

DelayedLottieView.displayName = 'DelayedLottieView';
