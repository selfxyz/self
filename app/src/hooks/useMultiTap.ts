// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useRef } from 'react';

export interface MultiTapThreshold {
  /** Tap count, within the rolling window, at which `onReach` fires. */
  taps: number;
  onReach: () => void;
}

interface UseMultiTapOptions {
  /** Ordered thresholds keyed off the same tap streak. */
  thresholds: MultiTapThreshold[];
  /** Max gap between taps before the streak resets. Defaults to 800ms. */
  windowMs?: number;
}

/**
 * Returns a press handler for hidden "tap N times" affordances (e.g. unlocking
 * dev/troubleshooting modes). Deliberately uses a plain JS counter rather than
 * react-native-gesture-handler/Reanimated: a tap count needs no worklet, and
 * routing it through the native gesture path was the source of a Reanimated
 * `_performOperations == nil` crash. Wire the returned handler to a `Pressable`
 * `onPress`. The streak resets once the highest threshold is reached.
 */
export function useMultiTap({
  thresholds,
  windowMs = 800,
}: UseMultiTapOptions): () => void {
  const state = useRef({ count: 0, lastTapAt: 0 });

  return useCallback(() => {
    const now = Date.now();
    const s = state.current;
    s.count = now - s.lastTapAt > windowMs ? 1 : s.count + 1;
    s.lastTapAt = now;

    const maxTaps = Math.max(...thresholds.map(t => t.taps));
    for (const t of thresholds) {
      if (s.count === t.taps) t.onReach();
    }
    if (s.count >= maxTaps) {
      s.count = 0;
      s.lastTapAt = 0;
    }
  }, [thresholds, windowMs]);
}

export default useMultiTap;
