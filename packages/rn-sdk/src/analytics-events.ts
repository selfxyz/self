// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Product-funnel event names fired through the injected AnalyticsSink on
 * WebView load outcomes. Distinct from the Sentry diagnostics (onLoadDiagnostic)
 * — diagnostics are error telemetry, these track how many users hit a load
 * failure or the "update Self app" wall before verifying.
 *
 * Names follow the Self app's "Category: Title Case" convention. The same
 * strings are mirrored in the app's keep-list at
 * packages/mobile-sdk-alpha/src/constants/analytics.ts (WebViewEvents) so the
 * app's analytics validation recognizes them.
 */
export const WebViewLoadEvents = {
  LOAD_FAILED: 'WebView: Load Failed',
  VERSION_MISMATCH: 'WebView: Version Mismatch',
  LOAD_RECOVERED: 'WebView: Load Recovered',
} as const;
