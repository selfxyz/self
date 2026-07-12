// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useEffect, useRef, useState } from 'react';

import { useSelfClient } from '@selfxyz/mobile-sdk-alpha';

import { nfcDebugRelayUrl } from '@/consts/nfcDebug';
import {
  isNfcDebugBridgeSupported,
  startBridge,
  stopBridge,
  subscribeSessionOver,
} from '@/integrations/nfc/nfcDebugBridge';
import type { NfcDebugSessionOverEvent } from '@/integrations/nfc/passportReader';
import type { DebugReport, DebugResult } from '@/services/nfcDebug';
import {
  getResult,
  mintSession,
  NfcDebugUnavailableError,
} from '@/services/nfcDebug';
import { friendlyRunError } from '@/utils/nfcDebugOutcome';

export type NfcDebugState =
  | 'idle'
  | 'starting'
  | 'waiting'
  | 'running'
  | 'done'
  | 'error';

const POLL_INTERVAL_MS = 1500;
// Client-owned failure: the passport never connected (no `running` seen) — a
// missed tap or a socket that never came up, not a slow agent.
const CONNECT_TIMEOUT_MS = 45_000;
// Liveness guard: give up only after this many *consecutive* result-poll
// failures (the server is unreachable). Run duration is server-owned — once the
// agent is `running`, the server ends the run on its own deadline and tells us
// via a terminal poll state (done/error) and the session-over event, so the
// client applies no wall-clock limit to how long a live run may take.
const MAX_POLL_FAILURES = 5;
// Once the server signals run-complete (WS close), the report is stored and the
// next poll should return `done`. Bound how long we wait for it so a server that
// closed but never persisted a result can't spin the poll loop forever.
const MAX_POST_CLOSE_POLLS = 5;

const UNAVAILABLE_MSG =
  'Diagnostics are unavailable right now. Please try again later.';
// Never saw the agent connect — the passport was likely never presented.
const NO_CONNECT_MSG =
  'We couldn’t connect to your passport. Hold it flat against the phone and try again.';

/**
 * Drives the user-facing NFC-debug flow: mint an auto-run session, arm the
 * device leg (connecting triggers the server-side agent), and poll for the
 * result. The bridge is always torn down on exit; MRZ comes from the store.
 */
export const useNfcDebugRun = () => {
  const selfClient = useSelfClient();
  const { useMRZStore } = selfClient;
  const { passportNumber, dateOfBirth, dateOfExpiry } = useMRZStore();

  const [state, setState] = useState<NfcDebugState>('idle');
  const [result, setResult] = useState<DebugReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cancelledRef = useRef(false);
  const sawRunningRef = useRef(false);
  // Set by the native session-over event; `wakeRef` lets that event cut the
  // current poll-interval sleep short so we react to the run finishing at once.
  const sessionOverRef = useRef<NfcDebugSessionOverEvent | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);

  const hasMrz = Boolean(passportNumber && dateOfBirth && dateOfExpiry);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      wakeRef.current?.();
      stopBridge().catch(() => undefined);
    },
    [],
  );

  const reset = useCallback(() => {
    cancelledRef.current = true;
    wakeRef.current?.();
    stopBridge().catch(() => undefined);
    setState('idle');
    setError(null);
    setResult(null);
  }, []);

  const run = useCallback(async () => {
    if (!isNfcDebugBridgeSupported) {
      setError('Not supported on this device.');
      setState('error');
      return;
    }
    if (!hasMrz) {
      setError('Scan your passport first.');
      setState('error');
      return;
    }

    cancelledRef.current = false;
    sawRunningRef.current = false;
    sessionOverRef.current = null;
    setError(null);
    setResult(null);
    setState('starting');

    // Poll-interval sleep that the session-over event can cut short.
    const sleep = (ms: number) =>
      new Promise<void>(resolve => {
        const timer = setTimeout(() => {
          wakeRef.current = null;
          resolve();
        }, ms);
        wakeRef.current = () => {
          clearTimeout(timer);
          wakeRef.current = null;
          resolve();
        };
      });

    let armed = false;
    let unsubscribe: (() => void) | undefined;
    try {
      const { session } = await mintSession();
      if (cancelledRef.current) {
        return;
      }
      await startBridge({
        relayUrl: nfcDebugRelayUrl,
        sessionKey: session,
        documentNumber: passportNumber,
        dateOfBirth,
        dateOfExpiry,
      });
      armed = true;
      // The server closes the relay when the run finishes (or drops for good).
      // Record it and wake the poll loop so we fetch the final result at once
      // instead of waiting out the interval — or the overall timeout.
      unsubscribe = subscribeSessionOver(event => {
        sessionOverRef.current = event;
        wakeRef.current?.();
      });
      setState('waiting');

      const startedAt = Date.now();
      let pollFailures = 0;
      let postClosePolls = 0;
      while (!cancelledRef.current) {
        // The native session-over signal is authoritative and checked first, so
        // a fatal close ends the run at once even while polls are failing.
        // Cast: TS over-narrows `.current` to null after the reset above and
        // doesn't credit the event-callback assignment.
        const over = sessionOverRef.current as NfcDebugSessionOverEvent | null;
        if (over && !over.runComplete) {
          // The connection dropped for good — no report is coming.
          setError(friendlyRunError(over.reason));
          setState('error');
          return;
        }

        let r: DebugResult;
        try {
          r = await getResult(session);
          pollFailures = 0;
        } catch (e) {
          if (cancelledRef.current) {
            return;
          }
          // A transient poll failure shouldn't end a live run; give up only
          // once the server is unreachable for several polls in a row.
          if (!(e instanceof NfcDebugUnavailableError)) {
            throw e;
          }
          pollFailures += 1;
          if (pollFailures >= MAX_POLL_FAILURES) {
            setError(UNAVAILABLE_MSG);
            setState('error');
            return;
          }
          await sleep(POLL_INTERVAL_MS);
          continue;
        }
        if (cancelledRef.current) {
          return;
        }
        if (r.state === 'done') {
          setResult(r.report ?? null);
          setState('done');
          return;
        }
        if (r.state === 'error') {
          setError(friendlyRunError(r.error));
          setState('error');
          return;
        }
        if (r.state === 'running') {
          sawRunningRef.current = true;
          setState('running');
        } else {
          setState('waiting');
        }
        // Run-complete close but the result isn't terminal yet: the report is
        // imminent, but bound the wait so a server that closed without ever
        // persisting a result can't spin us forever.
        if (over?.runComplete) {
          postClosePolls += 1;
          if (postClosePolls >= MAX_POST_CLOSE_POLLS) {
            setError(UNAVAILABLE_MSG);
            setState('error');
            return;
          }
        }
        // The only client-owned duration limit: the agent never connected.
        // Once `running`, the server owns when the run ends (see MAX_POLL_FAILURES).
        if (
          !sawRunningRef.current &&
          Date.now() - startedAt > CONNECT_TIMEOUT_MS
        ) {
          setError(NO_CONNECT_MSG);
          setState('error');
          return;
        }
        await sleep(POLL_INTERVAL_MS);
      }
    } catch (e) {
      if (cancelledRef.current) {
        return;
      }
      setError(
        e instanceof NfcDebugUnavailableError
          ? UNAVAILABLE_MSG
          : e instanceof Error
            ? e.message
            : String(e),
      );
      setState('error');
    } finally {
      unsubscribe?.();
      if (armed) {
        stopBridge().catch(() => undefined);
      }
    }
  }, [hasMrz, passportNumber, dateOfBirth, dateOfExpiry]);

  return {
    state,
    result,
    error,
    run,
    reset,
    hasMrz,
    isSupported: isNfcDebugBridgeSupported,
  };
};
