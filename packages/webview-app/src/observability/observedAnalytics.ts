// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { tagsFromAnalyticsEvent } from '@selfxyz/mobile-sdk-alpha/browser';
import { OnboardingEvents } from '@selfxyz/mobile-sdk-alpha/constants/analytics';

import { clearOnboardingTags, setOnboardingTags } from '../config/sentry';

/**
 * Mirrors the RN host's cohort-tag side effect (app/src/services/analytics.ts):
 * clear the cohort tags on the terminal `Onboarding: Ended` event, otherwise
 * stamp the WebView Sentry scope with the snapshot derived from the event.
 */
export function recordCohortTags(eventName: string, properties?: Record<string, unknown>): void {
  if (eventName === OnboardingEvents.ENDED) {
    clearOnboardingTags();
    return;
  }
  setOnboardingTags(tagsFromAnalyticsEvent(eventName, properties));
}

type TrackingAdapter = {
  // Method shorthand (not a function-typed property) so the parameter is
  // checked bivariantly — this lets both the bridge adapter (`event: string`)
  // and the SDK adapter (`event: KnownEventName`) satisfy the constraint.
  trackEvent?(event: string, payload?: Record<string, unknown>): void;
};

/**
 * Decorates an analytics adapter so every tracked event updates the WebView
 * Sentry cohort tags before delegating to the underlying delivery. Used for
 * both the UI-facing adapter and the SDK client adapter so cohort tags are set
 * regardless of which path emits an onboarding event.
 */
export function withCohortTags<A extends TrackingAdapter>(adapter: A): A {
  return {
    ...adapter,
    trackEvent(event: string, payload?: Record<string, unknown>) {
      recordCohortTags(event, payload);
      (adapter.trackEvent as TrackingAdapter['trackEvent'])?.(event, payload);
    },
  } as A;
}
