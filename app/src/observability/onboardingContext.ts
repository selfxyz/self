// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import * as Sentry from '@sentry/react-native';

import { sanitizeTagValue } from '@/config/sentry';

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
    Sentry.setTag(key, null);
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

export function tagsFromAnalyticsEvent(
  eventName: string,
  properties: Record<string, unknown> | undefined,
): OnboardingTagSnapshot {
  if (!properties) return {};
  if (!isOnboardingEvent(eventName)) return {};

  const snapshot: OnboardingTagSnapshot = {};
  const setString = <K extends keyof OnboardingTagSnapshot>(
    key: K,
    value: unknown,
  ): void => {
    if (typeof value === 'string') snapshot[key] = value;
  };

  setString('attempt_id', properties.attempt_id);
  setString('initial_branch', properties.initial_branch);
  setString('current_branch', properties.current_branch);
  setString('document_country', properties.country_code);
  setString('document_type', properties.document_type);
  setString('signature_algorithm', properties.signature_algorithm);
  setString('csca_hash_algorithm', properties.csca_hash_function);
  if (eventName.startsWith('KYC:')) {
    setString('kyc_provider', properties.provider);
  }

  return snapshot;
}

function isOnboardingEvent(eventName: string): boolean {
  return (
    eventName.startsWith('Onboarding:') ||
    eventName.startsWith('Biometric:') ||
    eventName.startsWith('KYC:') ||
    eventName.startsWith('Aadhaar:') ||
    eventName.startsWith('Passport:')
  );
}
