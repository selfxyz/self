// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useState } from 'react';

export interface ProvingStallTimeoutParams {
  currentState: string;
  isFocused: boolean;
  sessionId: string | null;
  stallStates: Set<string>;
  timeoutMs: number;
}

export interface ProvingStallTimeout {
  hasTimedOut: boolean;
  timedOutSessionId: string | null;
}

/**
 * Arms a single timeout while the proving flow sits in a stall-prone state and
 * the screen is focused. When it fires, the flow is marked timed-out and the
 * session id in effect at that moment is captured for downstream reporting.
 * The timed-out flag resets whenever the session id changes.
 */
export function useProvingStallTimeout({
  currentState,
  isFocused,
  sessionId,
  stallStates,
  timeoutMs,
}: ProvingStallTimeoutParams): ProvingStallTimeout {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [timedOutSessionId, setTimedOutSessionId] = useState<string | null>(
    null,
  );

  const [prevSessionId, setPrevSessionId] = useState(sessionId);
  if (prevSessionId !== sessionId) {
    setPrevSessionId(sessionId);
    setHasTimedOut(false);
    setTimedOutSessionId(null);
  }

  // Track the active stall state (not just a boolean) so that progressing from
  // one stall-prone state to another restarts the window — each active state
  // gets its own full timeout rather than sharing one from the first entry.
  const stallState =
    isFocused && !hasTimedOut && stallStates.has(currentState)
      ? currentState
      : null;

  useEffect(() => {
    if (stallState === null) return;
    const timer = setTimeout(() => {
      setTimedOutSessionId(sessionId);
      setHasTimedOut(true);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [stallState, sessionId, timeoutMs]);

  return { hasTimedOut, timedOutSessionId };
}
