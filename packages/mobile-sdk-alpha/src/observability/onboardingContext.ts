// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Platform-agnostic observability helpers shared by the RN host
// (@sentry/react-native) and the WebView app (@sentry/react). This module must
// not import react-native, any Sentry SDK, browser globals, or app aliases —
// each runtime wires these pure helpers into its own Sentry SDK.

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

export const COHORT_TAG_KEYS: readonly (keyof OnboardingTagSnapshot)[] = [
  'attempt_id',
  'initial_branch',
  'current_branch',
  'document_country',
  'document_type',
  'signature_algorithm',
  'csca_hash_algorithm',
  'kyc_provider',
];

export const REDACTED = '[REDACTED]';

export const SENSITIVE_KEY_PATTERN =
  /passport|mrz|dg\d|chip|aadhaar|(?:first|last|full|given|family|holder|sur)_?name|name_?(?:first|last|of_?holder|holder)|date_?of_?birth|dob|birth|photo|email/i;

function isOnboardingEvent(eventName: string): boolean {
  return (
    eventName.startsWith('Onboarding:') ||
    eventName.startsWith('Biometric:') ||
    eventName.startsWith('KYC:') ||
    eventName.startsWith('Aadhaar:') ||
    eventName.startsWith('Passport:')
  );
}

export function tagsFromAnalyticsEvent(
  eventName: string,
  properties: Record<string, unknown> | undefined,
): OnboardingTagSnapshot {
  if (!properties) return {};
  if (!isOnboardingEvent(eventName)) return {};

  const snapshot: OnboardingTagSnapshot = {};
  const setString = <K extends keyof OnboardingTagSnapshot>(key: K, value: unknown): void => {
    if (typeof value === 'string') snapshot[key] = value;
  };

  setString('attempt_id', properties.attempt_id);
  setString('initial_branch', properties.initial_branch);
  setString('current_branch', properties.current_branch);
  setString('document_country', properties.country_code);
  setString('document_type', properties.document_type);
  setString('signature_algorithm', properties.signature_algorithm);
  setString('csca_hash_algorithm', properties.csca_hash_algorithm);
  if (eventName.startsWith('KYC:')) {
    setString('kyc_provider', properties.provider);
  }

  return snapshot;
}

export function sanitizeTagValue(value: unknown): string {
  if (value == null) return '';

  const MAX_TAG_LENGTH = 200;
  const normalized = String(value)
    .replace(/[<>&"']/g, char => {
      switch (char) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case '"':
          return '&quot;';
        case "'":
          return '&#x27;';
        default:
          return char;
      }
    })
    .replace(/[^\x20-\x7E]/g, '');

  return normalized.length > MAX_TAG_LENGTH ? normalized.slice(0, MAX_TAG_LENGTH - 3) + '...' : normalized;
}

function stripUrlQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

const URL_BREADCRUMB_KEYS = ['url', 'to', 'from'] as const;

function redactObjectInPlace<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      obj[key as keyof T] = REDACTED as T[keyof T];
      continue;
    }
    const value = obj[key];
    if (value && typeof value === 'object') {
      redactObjectInPlace(value as Record<string, unknown>);
    }
  }
  return obj;
}

/**
 * Redacts PII-keyed fields from a Sentry-shaped event's `breadcrumbs`,
 * `contexts`, `extra`, `user`, and `request` in place. SDK-agnostic: both the
 * RN and browser Sentry SDKs expose these properties on their event object, so
 * each side wires this into its own `beforeSend`. `user` is included so feedback
 * `contact_email` (contexts.feedback) and `user.email` cannot leak; `request`
 * and breadcrumb URL fields are query-stripped so URL params from the browser
 * `HttpContext`/`Breadcrumbs` integrations cannot carry sensitive values.
 */
export function redactSensitiveFields<
  T extends {
    breadcrumbs?: Array<{ data?: Record<string, unknown> | undefined }>;
    contexts?: Record<string, unknown>;
    extra?: Record<string, unknown>;
    user?: Record<string, unknown> | null;
    request?: { url?: string; query_string?: unknown; cookies?: unknown; headers?: unknown; data?: unknown } | null;
  },
>(event: T): T {
  if (event.breadcrumbs) {
    for (const crumb of event.breadcrumbs) {
      if (crumb.data) {
        redactObjectInPlace(crumb.data);
        for (const key of URL_BREADCRUMB_KEYS) {
          if (typeof crumb.data[key] === 'string') {
            crumb.data[key] = stripUrlQuery(crumb.data[key] as string);
          }
        }
      }
    }
  }
  if (event.contexts) {
    redactObjectInPlace(event.contexts);
  }
  if (event.extra) {
    redactObjectInPlace(event.extra);
  }
  if (event.user) {
    redactObjectInPlace(event.user);
  }
  if (event.request) {
    const request = event.request;
    if (typeof request.url === 'string') request.url = stripUrlQuery(request.url);
    delete request.query_string;
    delete request.cookies;
    delete request.headers;
    if (request.data && typeof request.data === 'object') {
      redactObjectInPlace(request.data as Record<string, unknown>);
    }
  }
  return event;
}
