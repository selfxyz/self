// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { MutableRefObject } from 'react';
import { forwardRef, useCallback, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';

import type { Dotlottie, Mode } from '@lottiefiles/dotlottie-react-native';
import { DotLottie } from '@lottiefiles/dotlottie-react-native';

/**
 * Wrapper around DotLottie with legacy LottieView prop compatibility.
 *
 * DotLottie loads .lottie sources asynchronously on the native side, so its
 * built-in autoplay already waits for load — no manual delay needed.
 *
 * @example
 * <LottieAnimation autoPlay loop source={animation} style={styles.animation} />
 */
export type DotLottieSource = string | { uri: string };

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
  onFrame?: () => void;
  onStop?: () => void;
  onRender?: () => void;
  onTransition?: (state: { previousState: string; newState: string }) => void;
  onStateExit?: (state: { leavingState: string }) => void;
  onStateEntered?: (state: { enteringState: string }) => void;
};

type LottieAnimationProps = DotLottieEvents & {
  source: DotLottieSource;
  style?: ViewStyle;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  themeId?: string;
  marker?: string;
  segment?: number[];
  playMode?: Mode;
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

export const LottieAnimation = forwardRef<Dotlottie, LottieAnimationProps>((props, forwardedRef) => {
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
    onAnimationLoaded?.();
    onLoad?.();
  }, [onAnimationLoaded, onLoad]);

  const handleComplete = useCallback(() => {
    onAnimationFinish?.(false);
    onComplete?.();
  }, [onAnimationFinish, onComplete]);

  return (
    <DotLottie
      ref={handleRef}
      {...rest}
      style={style ?? {}}
      autoplay={shouldAutoPlay}
      onLoad={handleLoad}
      onComplete={handleComplete}
    />
  );
});

LottieAnimation.displayName = 'LottieAnimation';
