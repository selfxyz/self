// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DebugReport } from '@/services/nfcDebug';

// Turns an NFC-debug run outcome into user-facing copy + a tone. Kept as a pure
// module (no RN/UI deps) so the terminal-state wording lives in one place and is
// unit-testable. The screen maps `tone` to a color.
//
// The key distinction the UI needs: a run can end `done` yet have the server
// close the connection because the tag dropped (`terminationReason:
// device_dropped`) — that is NOT a clean completion and must read differently
// from `completed`. `terminationReason` is authoritative, so it takes precedence
// over `status` when classifying.

export type NfcDebugTone = 'success' | 'warn' | 'error';

export interface NfcDebugOutcome {
  message: string;
  tone: NfcDebugTone;
}

const STATUS_MESSAGE: Record<DebugReport['status'], NfcDebugOutcome> = {
  success: {
    message: 'Read succeeded — thanks, this helps us fix the issue.',
    tone: 'success',
  },
  partial: {
    message: 'Partial read — we captured useful diagnostics.',
    tone: 'warn',
  },
  failed: {
    message:
      "We couldn't complete the read, but captured diagnostics to investigate.",
    tone: 'error',
  },
};

/**
 * Classifies a completed run's report. A dropped connection (`device_dropped`)
 * always overrides — it means the run didn't finish cleanly even if `status`
 * looks fine. Otherwise a `success` status wins (the read worked; how the agent
 * later wound down, e.g. hitting a turn cap, isn't the user's concern), and only
 * then do the remaining termination reasons refine a non-success outcome.
 */
export const describeOutcome = (report: DebugReport): NfcDebugOutcome => {
  if (report.terminationReason === 'device_dropped') {
    return {
      message:
        'The connection to your passport dropped before the read finished. Hold it flat against the phone and try again.',
      tone: 'warn',
    };
  }
  if (report.status === 'success') {
    return STATUS_MESSAGE.success;
  }
  switch (report.terminationReason) {
    case 'deadline':
    case 'turn_cap':
      return {
        message:
          'Diagnostics ran out of time, but we captured useful data. You can try again.',
        tone: 'warn',
      };
    case 'unrecoverable_sm':
      return {
        message:
          "Your passport's secure channel couldn't be established — we captured diagnostics to investigate.",
        tone: 'error',
      };
    case 'refusal':
    case 'error':
      return {
        message: "The debug run couldn't complete. Please try again.",
        tone: 'error',
      };
    default:
      return STATUS_MESSAGE[report.status] ?? STATUS_MESSAGE.failed;
  }
};

/**
 * Maps a server-side run error (the `error` poll state) to a friendly line.
 * `raw` is the report's error / terminationReason string.
 */
export const friendlyRunError = (raw?: string): string => {
  if (raw && /drop|device|disconnect|reset/i.test(raw)) {
    return 'The connection to your passport dropped. Keep it still against the phone and try again.';
  }
  return 'The debug run didn’t complete. Please try again.';
};
