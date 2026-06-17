// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef } from 'react';

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
  // Keep the latest config without re-creating the handler. Callers pass inline
  // `thresholds` literals (new identity every render), so depending on them in
  // useCallback would defeat memoization; syncing via an effect keeps the
  // returned handler stable (safe for React.memo'd children) while still always
  // reading fresh thresholds. Updated in an effect rather than during render to
  // avoid mutating a ref mid-render.
  const configRef = useRef({ thresholds, windowMs });
  useEffect(() => {
    configRef.current = { thresholds, windowMs };
  });

  return useCallback(() => {
    const { thresholds: active, windowMs: window } = configRef.current;
    const now = Date.now();
    const s = state.current;
    s.count = now - s.lastTapAt > window ? 1 : s.count + 1;
    s.lastTapAt = now;

    const maxTaps = Math.max(...active.map(t => t.taps));
    for (const t of active) {
      if (s.count === t.taps) t.onReach();
    }
    if (s.count >= maxTaps) {
      s.count = 0;
      s.lastTapAt = 0;
    }
  }, []);
}

export default useMultiTap;
