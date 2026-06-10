// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as Sentry from '@sentry/react-native';

import type { OnboardingTagSnapshot } from '@selfxyz/mobile-sdk-alpha/observability';
import {
  COHORT_TAG_KEYS,
  sanitizeTagValue,
  tagsFromAnalyticsEvent,
} from '@selfxyz/mobile-sdk-alpha/observability';

export type { OnboardingTagSnapshot };
export { tagsFromAnalyticsEvent };

export function clearOnboardingTags(): void {
  for (const key of COHORT_TAG_KEYS) {
    Sentry.setTag(key, undefined);
  }
}

export function setOnboardingTags(snapshot: OnboardingTagSnapshot): void {
  for (const key of COHORT_TAG_KEYS) {
    const value = snapshot[key];
    if (value === undefined || value === null || value === '') continue;
    const sanitized = sanitizeTagValue(value);
    if (!sanitized) continue;
    Sentry.setTag(key, sanitized);
  }
}
