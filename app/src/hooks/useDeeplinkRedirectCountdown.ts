// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface DeeplinkRedirectCountdownParams {
  seconds: number;
  shouldStart: boolean;
  isFocused: boolean;
  resetKey: unknown;
  onRedirect: () => void;
}

export interface DeeplinkRedirectCountdown {
  countdown: number | null;
  cancel: () => void;
}

/**
 * Counts down from `seconds` once `shouldStart` is met while focused, then fires
 * `onRedirect` at zero. Losing focus hides the countdown without restarting it;
 * a change to `resetKey` (the session) clears the latch so a new session can run
 * its own countdown.
 */
export function useDeeplinkRedirectCountdown({
  seconds,
  shouldStart,
  isFocused,
  resetKey,
  onRedirect,
}: DeeplinkRedirectCountdownParams): DeeplinkRedirectCountdown {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const onRedirectRef = useRef(onRedirect);
  useEffect(() => {
    onRedirectRef.current = onRedirect;
  });

  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setStarted(false);
    setCountdown(null);
  }

  if (shouldStart && isFocused && !started) {
    setStarted(true);
    setCountdown(seconds);
  }

  const [wasFocused, setWasFocused] = useState(isFocused);
  if (wasFocused !== isFocused) {
    setWasFocused(isFocused);
    if (!isFocused && countdown !== null) {
      setCountdown(null);
    }
  }

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      onRedirectRef.current();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const cancel = useCallback(() => setCountdown(null), []);

  return { countdown, cancel };
}
