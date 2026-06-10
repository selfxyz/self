// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Single local palette for the built-in loading/error fallback. rn-sdk has no
 * design-token package and must not pull in Euclid (see WIA-09 plan, Locked
 * decisions), so consumers that want branded UI pass `renderLoading` /
 * `renderError`. This palette only backs the default screen shown when a
 * consumer supplies nothing — one source of truth instead of scattered hex.
 */
export const COLORS = {
  bg: '#000',
  fg: '#fff',
} as const;
