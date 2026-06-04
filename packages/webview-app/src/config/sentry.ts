// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { OnboardingTagSnapshot } from '@selfxyz/mobile-sdk-alpha/browser';
import { COHORT_TAG_KEYS, redactSensitiveFields, sanitizeTagValue } from '@selfxyz/mobile-sdk-alpha/browser';

import { breadcrumbsIntegration, init as sentryInit, setTag } from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export const isSentryEnabled = Boolean(SENTRY_DSN);

export function initSentry(): void {
  if (!isSentryEnabled) return;

  sentryInit({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Default integrations capture unhandled errors. Session Replay is NOT a
    // default integration and is intentionally not added here — WIA-13 owns
    // replay sample rates and DOM mask wrappers.
    // No tracing/performance instrumentation (parity with ANA-13).
    tracesSampleRate: 0,
    // Drop the free-text breadcrumb sources: `dom` captures user input/labels
    // and `console` captures arbitrary logged strings, both of which can hold
    // PII that beforeSend cannot reliably scrub. URL-bearing crumbs (navigation/
    // fetch/xhr) stay on; their query strings are stripped in redactSensitiveFields.
    integrations: defaults => [
      ...defaults.filter(integration => integration.name !== 'Breadcrumbs'),
      breadcrumbsIntegration({ console: false, dom: false }),
    ],
    // The runtime tag distinguishes WebView events from the RN host's
    // `runtime: rn-host` in the shared Sentry project. Set once, never cleared.
    initialScope: { tags: { runtime: 'webview' } },
    beforeSend(event) {
      return redactSensitiveFields(event);
    },
  });
}

export function setOnboardingTags(snapshot: OnboardingTagSnapshot): void {
  if (!isSentryEnabled) return;
  for (const key of COHORT_TAG_KEYS) {
    const value = snapshot[key];
    if (value === undefined || value === null || value === '') continue;
    const sanitized = sanitizeTagValue(value);
    if (!sanitized) continue;
    setTag(key, sanitized);
  }
}

export function clearOnboardingTags(): void {
  if (!isSentryEnabled) return;
  for (const key of COHORT_TAG_KEYS) {
    setTag(key, undefined);
  }
}
