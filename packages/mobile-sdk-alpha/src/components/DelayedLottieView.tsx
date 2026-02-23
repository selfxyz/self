// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { LottieViewProps } from 'lottie-react-native';
import LottieView from 'lottie-react-native';
import type React from 'react';
import { forwardRef, useCallback, useRef } from 'react';

/**
 * Wrapper around LottieView that fixes iOS native module initialization timing.
 *
 * On iOS, the Lottie native module isn't always fully initialized when components
 * first render during app startup, and dotLottie (.lottie) sources load
 * asynchronously on the native side. This component waits for `onAnimationLoaded`
 * before calling `play()`, so the animation starts reliably regardless of source
 * format (JSON or dotLottie).
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

  const handleAnimationLoaded = useCallback(() => {
    if (props.autoPlay) {
      ref.current?.play();
    }
    props.onAnimationLoaded?.();
  }, [props.autoPlay, props.onAnimationLoaded, ref]);

  // For autoPlay animations, disable native autoPlay and control it ourselves
  const modifiedProps = props.autoPlay ? { ...props, autoPlay: false } : props;

  return <LottieView ref={ref} {...modifiedProps} onAnimationLoaded={handleAnimationLoaded} />;
});

DelayedLottieView.displayName = 'DelayedLottieView';
