// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Shared base types extracted to break circular dependencies.
 *
 * @module types/base
 */

/** Logging severity passed to adapters and events. */
export type LogLevel = 'info' | 'warn' | 'error';

/** Progress update emitted during multi-step flows like proving or NFC reads. */
export interface Progress {
  /** Identifier for the active step (for example `nfc.read`). */
  step: string;
  /** Percentage between 0 and 100 when available. */
  percent?: number;
}
