// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as Sentry from '@sentry/react-native';

import { sanitizeTagValue } from '@/config/sentry';

// Cohort tags applied at the Sentry session scope. The keys must match the
// whitelist enforced by sanitizeTagKey in app/src/config/sentry.ts. Adding a
// new key here also requires adding it to ALLOWED_TAG_KEYS.
export interface OnboardingTagSnapshot {
  attempt_id?: string;
  initial_branch?: string;
  current_branch?: string;
  document_country?: string;
  document_type?: string;
  signature_algorithm?: string;
  csca_hash_algorithm?: string;
  kyc_provider?: string;
}

const COHORT_TAG_KEYS: readonly (keyof OnboardingTagSnapshot)[] = [
  'attempt_id',
  'initial_branch',
  'current_branch',
  'document_country',
  'document_type',
  'signature_algorithm',
  'csca_hash_algorithm',
  'kyc_provider',
];

export function clearOnboardingTags(): void {
  for (const key of COHORT_TAG_KEYS) {
    Sentry.setTag(key, null as unknown as string);
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

// Map an analytics event payload onto the cohort tag snapshot. The mapping is
// the only place we translate between analytics property names and Sentry tag
// names — keep it narrow so a typo in one event payload doesn't quietly
// pollute every session's tags.
export function tagsFromAnalyticsEvent(
  eventName: string,
  properties: Record<string, unknown> | undefined,
): OnboardingTagSnapshot {
  if (!properties) return {};
  if (!isOnboardingEvent(eventName)) return {};

  const snapshot: OnboardingTagSnapshot = {};

  if (typeof properties.attempt_id === 'string') {
    snapshot.attempt_id = properties.attempt_id;
  }
  if (typeof properties.initial_branch === 'string') {
    snapshot.initial_branch = properties.initial_branch;
  }
  if (typeof properties.current_branch === 'string') {
    snapshot.current_branch = properties.current_branch;
  }
  if (typeof properties.country_code === 'string') {
    snapshot.document_country = properties.country_code;
  }
  if (typeof properties.document_type === 'string') {
    snapshot.document_type = properties.document_type;
  }
  if (typeof properties.signature_algorithm === 'string') {
    snapshot.signature_algorithm = properties.signature_algorithm;
  }
  if (typeof properties.csca_hash_function === 'string') {
    snapshot.csca_hash_algorithm = properties.csca_hash_function;
  }
  if (typeof properties.provider === 'string' && eventName.startsWith('Kyc:')) {
    snapshot.kyc_provider = properties.provider;
  }

  return snapshot;
}

function isOnboardingEvent(eventName: string): boolean {
  return (
    eventName.startsWith('Onboarding:') ||
    eventName.startsWith('Biometric:') ||
    eventName.startsWith('Kyc:') ||
    eventName.startsWith('Aadhaar:') ||
    // Legacy Passport: events still emit during the ANA-13 transition window.
    eventName.startsWith('Passport:')
  );
}
