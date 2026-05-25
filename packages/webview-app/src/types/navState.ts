// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Shared shape for everything we pass through `react-router-dom`'s
 * `location.state`. Every screen reading `location.state` should cast
 * to `Partial<NavState>` (or an intersection with screen-specific slots)
 * rather than inventing a one-off local type.
 *
 * NAV-09 decisions:
 *   - Forward target is always `nextPath`. The legacy `returnTo` slot in
 *     the recovery cluster was renamed to `nextPath`; the URL `?returnTo=`
 *     query param was dropped (state-only).
 *   - Back target is `backPath` when the caller needs to override the
 *     react-router history default.
 *   - Any new well-typed slot belongs on this interface, not in a local
 *     one-off type.
 */
export interface NavState {
  /**
   * Forward target after the current screen completes. Successor of the
   * legacy `returnTo` slot in the recovery cluster.
   */
  nextPath?: string;
  /** Back target if non-default (overrides `navigate(-1)`). */
  backPath?: string;

  /** Document selection context, threaded through onboarding clusters. */
  countryCode?: string;
  documentType?: string;
  documentTypes?: string[];

  /** Result payload set by terminal screens before close. */
  result?: { success: boolean; error?: string; source?: string };

  /** Home-screen redirect suppression for re-entry after onboarding. */
  skipOnboardingRedirect?: boolean;

  /** EU-ID NFC inputs threaded between instructions → NFC scan. */
  canValue?: string;
  useCan?: boolean;
  mrz?: {
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
  };

  /** Provider integration result payload. */
  providerResult?: unknown;

  /** Error context threaded through document NFC error screens. */
  errorMessage?: string;
  stage?: 'mrz' | 'nfc';
}
