// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { nfcDebugApiBaseUrl } from '@/consts/nfcDebug';

// Client for the NFC-debug server's auto-start flow. The phone mints an
// auto-run session, arms the device leg (see nfcDebugBridge), then polls for
// the agent's result. No bearer/secret lives on the phone.
//
// TODO(security): per NFC_DEBUG_MOBILE_INTEGRATION.md, POST /session must sit
// behind the app's edge auth before public exposure (minting + connecting a
// device starts a paid agent run). Add the app's auth header in `authHeaders()`
// once that gateway lands.

const REQUEST_TIMEOUT_MS = 10000;

export type DebugRunState = 'pending' | 'running' | 'done' | 'error';

export type DebugReportStatus = 'success' | 'partial' | 'failed';

// Only the fields the UI reads; the report carries more (all PII-free).
export interface DebugReport {
  status: DebugReportStatus;
  terminationReason?: string;
}

export interface DebugResult {
  state: DebugRunState;
  report?: DebugReport;
  error?: string;
}

/** Thrown when the NFC-debug server can't be reached or returns a non-OK status. */
export class NfcDebugUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NfcDebugUnavailableError';
  }
}

const authHeaders = (): Record<string, string> => ({
  // Placeholder: attach the app's edge auth here once /session is gated.
});

const request = async (path: string, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${nfcDebugApiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...authHeaders(),
        ...init?.headers,
      },
      signal: controller.signal,
    });
  } catch (e) {
    throw new NfcDebugUnavailableError(
      e instanceof Error ? e.message : String(e),
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

/** Mints an auto-run session; the agent starts when the device leg connects. */
export const mintSession = async (): Promise<{ session: string }> => {
  const res = await request('/session', {
    method: 'POST',
    body: JSON.stringify({ autoRun: true, target: 'device' }),
  });
  if (!res.ok) {
    throw new NfcDebugUnavailableError(`session mint failed (${res.status})`);
  }
  const data = (await res.json().catch(() => {
    throw new NfcDebugUnavailableError('session mint returned invalid JSON');
  })) as { session?: string };
  if (!data.session) {
    throw new NfcDebugUnavailableError('session mint returned no key');
  }
  return { session: data.session };
};

/** Polls the run outcome for a session. `pending` → `running` → `done`/`error`. */
export const getResult = async (session: string): Promise<DebugResult> => {
  const res = await request(`/debug/result/${encodeURIComponent(session)}`);
  if (!res.ok) {
    throw new NfcDebugUnavailableError(`result poll failed (${res.status})`);
  }
  return (await res.json().catch(() => {
    throw new NfcDebugUnavailableError('result poll returned invalid JSON');
  })) as DebugResult;
};
