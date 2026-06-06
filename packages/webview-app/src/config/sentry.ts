// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { OnboardingTagSnapshot } from '@selfxyz/mobile-sdk-alpha/browser';
import { COHORT_TAG_KEYS, redactSensitiveFields, sanitizeTagValue } from '@selfxyz/mobile-sdk-alpha/browser';

import { breadcrumbsIntegration, init as sentryInit, replayIntegration, setTag } from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export const isSentryEnabled = Boolean(SENTRY_DSN);

export function initSentry(): void {
  if (!isSentryEnabled) return;

  sentryInit({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // No tracing/performance instrumentation (parity with ANA-13).
    tracesSampleRate: 0,
    // Session Replay parity with the RN host (mobileReplayIntegration): 10% of
    // sessions, 100% of errored sessions. Browser replay has no maskAllImages/
    // maskAllVectors — blockAllMedia is the equivalent (covers <img> and <svg>).
    // These masking defaults are never disabled; the WebView's only PII render
    // sites (ID data + recovery mnemonic) are additionally wrapped in PrivacyMask.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Drop the free-text breadcrumb sources: `dom` captures user input/labels
    // and `console` captures arbitrary logged strings, both of which can hold
    // PII that beforeSend cannot reliably scrub. URL-bearing crumbs (navigation/
    // fetch/xhr) stay on; their query strings are stripped in redactSensitiveFields.
    integrations: defaults => [
      ...defaults.filter(integration => integration.name !== 'Breadcrumbs'),
      breadcrumbsIntegration({ console: false, dom: false }),
      replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
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

// Durable per-session reference tags, set as soon as the host-minted id is
// known so Sentry events outside any analytics path still carry it. Mirrors the
// RN host's setReferenceTag; engineers join runtimes by `reference_id`.
export function setReferenceTag(referenceId: string, verificationId?: string): void {
  if (!isSentryEnabled) return;
  const cid = sanitizeTagValue(referenceId);
  if (cid) setTag('reference_id', cid);
  if (verificationId) {
    const vid = sanitizeTagValue(verificationId);
    if (vid) setTag('verification_id', vid);
  } else {
    setTag('verification_id', undefined);
  }
}

export function clearReferenceTag(): void {
  if (!isSentryEnabled) return;
  setTag('reference_id', undefined);
  setTag('verification_id', undefined);
}
