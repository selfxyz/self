// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { MutableRefObject } from 'react';
import { forwardRef, useCallback, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';

import type { Dotlottie, Mode } from '@lottiefiles/dotlottie-react-native';
import { DotLottie } from '@lottiefiles/dotlottie-react-native';

/**
 * Wrapper around DotLottie that fixes iOS native module initialization timing.
 *
 * On iOS, the native animation module isn't always fully initialized when components
 * first render during app startup, and dotLottie (.lottie) sources load
 * asynchronously on the native side. This component waits for `onLoad`
 * before calling `play()`, so the animation starts reliably regardless of source
 * format.
 *
 * Usage: Drop-in replacement for LottieView with legacy prop compatibility.
 * @example
 * <DelayedLottieView autoPlay loop source={animation} style={styles.animation} />
 */
type DotLottieSource = string | { uri: string };

type DotLottieEvents = {
  onLoad?: () => void;
  onComplete?: () => void;
  onLoadError?: () => void;
  onPlay?: () => void;
  onLoop?: (loopCount: number) => void;
  onDestroy?: () => void;
  onUnFreeze?: () => void;
  onFreeze?: () => void;
  onPause?: () => void;
  onFrame?: (frameNo: number) => void;
  onStop?: () => void;
  onRender?: (frameNo: number) => void;
  onStateMachineStart?: () => void;
  onStateMachineStop?: () => void;
  onStateMachineStateEntered?: (enteringState: string) => void;
  onStateMachineStateExit?: (leavingState: string) => void;
  onStateMachineTransition?: (previousState: string, newState: string) => void;
  onStateMachineBooleanInputChange?: (inputName: string, oldValue: boolean, newValue: boolean) => void;
  onStateMachineNumericInputChange?: (inputName: string, oldValue: number, newValue: number) => void;
  onStateMachineStringInputChange?: (inputName: string, oldValue: string, newValue: string) => void;
  onStateMachineInputFired?: (inputName: string) => void;
  onStateMachineCustomEvent?: (message: string) => void;
  onStateMachineError?: (message: string) => void;
};

type DelayedLottieViewProps = DotLottieEvents & {
  source: DotLottieSource;
  style?: ViewStyle;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  themeId?: string;
  marker?: string;
  segment?: [number, number];
  playMode?: Mode;
  useFrameInterpolation?: boolean;
  stateMachineId?: string;
  // Legacy LottieView prop kept for mechanical migration
  autoPlay?: boolean;
  // Legacy lifecycle callbacks
  onAnimationLoaded?: () => void;
  onAnimationFinish?: (isCancelled: boolean) => void;
  // Legacy compatibility props (ignored by DotLottie)
  cacheComposition?: boolean;
  progress?: number;
  renderMode?: 'AUTOMATIC' | 'HARDWARE' | 'SOFTWARE';
  resizeMode?: 'cover' | 'contain' | 'center';
};

export const DelayedLottieView = forwardRef<Dotlottie, DelayedLottieViewProps>((props, forwardedRef) => {
  const {
    autoPlay,
    autoplay,
    onAnimationLoaded,
    onAnimationFinish,
    onLoad,
    onComplete,
    cacheComposition: _cacheComposition,
    progress: _progress,
    renderMode: _renderMode,
    resizeMode: _resizeMode,
    style,
    ...rest
  } = props;
  const internalRef = useRef<Dotlottie | null>(null);
  const shouldAutoPlay = useMemo(() => Boolean(autoPlay ?? autoplay), [autoPlay, autoplay]);

  const handleRef = useCallback(
    (instance: unknown) => {
      const lottieInstance = instance as Dotlottie | null;
      internalRef.current = lottieInstance;
      if (typeof forwardedRef === 'function') {
        forwardedRef(lottieInstance);
        return;
      }
      if (forwardedRef) {
        (forwardedRef as MutableRefObject<Dotlottie | null>).current = lottieInstance;
      }
    },
    [forwardedRef],
  );

  const handleLoad = useCallback(() => {
    if (shouldAutoPlay) {
      internalRef.current?.play();
    }
    onAnimationLoaded?.();
    onLoad?.();
  }, [shouldAutoPlay, onAnimationLoaded, onLoad]);

  const handleComplete = useCallback(() => {
    onAnimationFinish?.(false);
    onComplete?.();
  }, [onAnimationFinish, onComplete]);

  return (
    <DotLottie
      ref={handleRef}
      {...rest}
      style={style ?? {}}
      autoplay={shouldAutoPlay ? false : undefined}
      onLoad={handleLoad}
      onComplete={handleComplete}
    />
  );
});

DelayedLottieView.displayName = 'DelayedLottieView';
