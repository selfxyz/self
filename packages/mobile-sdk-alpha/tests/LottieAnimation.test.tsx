// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/* @vitest-environment jsdom */
import { createRef, forwardRef, type Ref } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LottieAnimation } from '../src/components/LottieAnimation';

import { render } from '@testing-library/react';

// Track props and ref passed to the underlying DotLottie mock
let capturedProps: Record<string, any> = {};
let capturedRef: Ref<any> | null = null;

const MockDotLottie = forwardRef((props: any, ref: any) => {
  capturedProps = { ...props };
  capturedRef = ref;
  return null;
});
MockDotLottie.displayName = 'MockDotLottie';

vi.mock('@lottiefiles/dotlottie-react-native', () => ({
  DotLottie: MockDotLottie,
  Mode: { FORWARD: 0, REVERSE: 1, BOUNCE: 2, REVERSE_BOUNCE: 3 },
}));

beforeEach(() => {
  capturedProps = {};
  capturedRef = null;
});

describe('LottieAnimation', () => {
  describe('autoPlay → autoplay mapping', () => {
    it('maps legacy autoPlay={true} to autoplay={true}', () => {
      render(<LottieAnimation autoPlay source="test.lottie" />);
      expect(capturedProps.autoplay).toBe(true);
    });

    it('maps legacy autoPlay={false} to autoplay={false}', () => {
      render(<LottieAnimation autoPlay={false} source="test.lottie" />);
      expect(capturedProps.autoplay).toBe(false);
    });

    it('passes native autoplay prop through', () => {
      render(<LottieAnimation autoplay source="test.lottie" />);
      expect(capturedProps.autoplay).toBe(true);
    });

    it('prefers autoPlay over autoplay when both are set', () => {
      render(<LottieAnimation autoPlay={false} autoplay={true} source="test.lottie" />);
      expect(capturedProps.autoplay).toBe(false);
    });

    it('defaults to false when neither is set', () => {
      render(<LottieAnimation source="test.lottie" />);
      expect(capturedProps.autoplay).toBe(false);
    });
  });

  describe('onAnimationLoaded → onLoad mapping', () => {
    it('calls onAnimationLoaded when DotLottie fires onLoad', () => {
      const onAnimationLoaded = vi.fn();
      render(<LottieAnimation source="test.lottie" onAnimationLoaded={onAnimationLoaded} />);
      capturedProps.onLoad();
      expect(onAnimationLoaded).toHaveBeenCalledOnce();
    });

    it('calls both onAnimationLoaded and onLoad when both are set', () => {
      const onAnimationLoaded = vi.fn();
      const onLoad = vi.fn();
      render(<LottieAnimation source="test.lottie" onAnimationLoaded={onAnimationLoaded} onLoad={onLoad} />);
      capturedProps.onLoad();
      expect(onAnimationLoaded).toHaveBeenCalledOnce();
      expect(onLoad).toHaveBeenCalledOnce();
    });
  });

  describe('onAnimationFinish → onComplete mapping', () => {
    it('calls onAnimationFinish with isCancelled=false on complete', () => {
      const onAnimationFinish = vi.fn();
      render(<LottieAnimation source="test.lottie" onAnimationFinish={onAnimationFinish} />);
      capturedProps.onComplete();
      expect(onAnimationFinish).toHaveBeenCalledWith(false);
    });

    it('always passes false for isCancelled (cancellation signal is lost)', () => {
      const onAnimationFinish = vi.fn();
      render(<LottieAnimation source="test.lottie" onAnimationFinish={onAnimationFinish} />);
      capturedProps.onComplete();
      capturedProps.onComplete();
      expect(onAnimationFinish).toHaveBeenCalledTimes(2);
      expect(onAnimationFinish).toHaveBeenNthCalledWith(1, false);
      expect(onAnimationFinish).toHaveBeenNthCalledWith(2, false);
    });

    it('calls both onAnimationFinish and onComplete when both are set', () => {
      const onAnimationFinish = vi.fn();
      const onComplete = vi.fn();
      render(<LottieAnimation source="test.lottie" onAnimationFinish={onAnimationFinish} onComplete={onComplete} />);
      capturedProps.onComplete();
      expect(onAnimationFinish).toHaveBeenCalledWith(false);
      expect(onComplete).toHaveBeenCalledOnce();
    });
  });

  describe('legacy props are dropped', () => {
    it('does not forward cacheComposition, progress, renderMode, or resizeMode', () => {
      render(
        <LottieAnimation
          source="test.lottie"
          cacheComposition={true}
          progress={0.5}
          renderMode="HARDWARE"
          resizeMode="cover"
        />,
      );
      expect(capturedProps.cacheComposition).toBeUndefined();
      expect(capturedProps.progress).toBeUndefined();
      expect(capturedProps.renderMode).toBeUndefined();
      expect(capturedProps.resizeMode).toBeUndefined();
    });

    it('forwards non-legacy props like loop and speed', () => {
      render(<LottieAnimation source="test.lottie" loop speed={2} />);
      expect(capturedProps.loop).toBe(true);
      expect(capturedProps.speed).toBe(2);
    });
  });

  describe('ref forwarding', () => {
    it('forwards function ref with the DotLottie instance', () => {
      const refFn = vi.fn();
      render(<LottieAnimation ref={refFn} source="test.lottie" />);
      // Simulate the native side calling the ref callback
      const fakeInstance = { play: vi.fn() };
      if (typeof capturedRef === 'function') {
        capturedRef(fakeInstance);
      }
      expect(refFn).toHaveBeenCalledWith(fakeInstance);
    });

    it('forwards object ref with the DotLottie instance', () => {
      const ref = createRef<any>();
      render(<LottieAnimation ref={ref} source="test.lottie" />);
      const fakeInstance = { play: vi.fn() };
      if (typeof capturedRef === 'function') {
        capturedRef(fakeInstance);
      }
      expect(ref.current).toBe(fakeInstance);
    });
  });

  describe('style handling', () => {
    it('passes through provided style', () => {
      const style = { width: 100, height: 100 };
      render(<LottieAnimation source="test.lottie" style={style} />);
      expect(capturedProps.style).toEqual(style);
    });

    it('defaults to empty object when no style is provided', () => {
      render(<LottieAnimation source="test.lottie" />);
      expect(capturedProps.style).toEqual({});
    });
  });
});
