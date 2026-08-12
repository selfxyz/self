// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { VerificationRequest } from './SelfVerification';

/**
 * Self Enterprise session reference. The partner backend creates the session
 * (`@selfxyz/enterprise-sdk` `sessions.create`, authenticated with the secret
 * `sk_` API key) and hands the app either the returned `verificationUrl`
 * (`https://verify.self.xyz/s/<session-uuid>`) or the bare session id. The
 * `sk_` key never reaches the client — the session id is the only capability
 * this SDK consumes, resolved against edge-api's public session endpoint.
 *
 * The session id doubles as a bearer secret (post-completion the public
 * endpoint returns the disclosed attributes) — it is never logged, put in
 * analytics payloads, or serialized into diagnostics by this module.
 */
export interface EnterpriseSession {
  /** Session id (UUID) from `sessions.create`. Wins over `url` when both are set. */
  id?: string;
  /** The `verificationUrl` from `sessions.create`; the id is extracted from its path. */
  url?: string;
  /** edge-api base URL override (local/staging edge-api). Default: production. */
  apiUrl?: string;
}

export interface EnterpriseSessionError {
  code:
    | 'SESSION_REF_INVALID'
    | 'SESSION_NOT_FOUND'
    | 'SESSION_EXPIRED'
    | 'SESSION_ALREADY_PROCESSED'
    | 'SESSION_RESOLVE_FAILED';
  message: string;
}

/** Shape of edge-api's public `GET /v1/sessions/:id` (PublicSessionResponse). */
interface EnterpriseSessionInfo {
  id: string;
  orgId: string;
  environment: 'test' | 'live' | string;
  status: 'pending' | 'valid' | 'invalid' | 'error' | 'expired' | string;
  expiresAt: string;
  flowName: string | null;
  externalUuid: string;
  predicatesConfig: Record<string, unknown> | null;
  iconUrl: string | null;
}

const DEFAULT_EDGE_API_URL = 'https://edge.dashboard.self.xyz';
// The verifier base is server-side hosted-page config and absent from every
// edge-api response, so it is pinned here exactly as the enterprise backend
// SDK pins it (self-dashboard packages/self-enterprise-sdk/src/verify-proof.ts).
// ES-01 asks edge-api to return a server-derived selfApp block instead.
const VERIFIER_URL = 'https://verifier.self.xyz';
const VERIFIER_URL_STAGING = 'https://verifier.staging.self.xyz';

const RESOLVE_TIMEOUT_MS = 30_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Future-proofing: edge-api plans to flip the verificationUrl path segment
// from the session UUID to the opaque `verify_<env>_<random>` token.
const OPAQUE_REF_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;

function sessionError(
  code: EnterpriseSessionError['code'],
  message: string,
): EnterpriseSessionError {
  return { code, message };
}

/**
 * Extracts the session reference from an EnterpriseSession: an explicit `id`
 * wins; otherwise the last path segment of `url` (`.../s/<ref>`). Accepts a
 * UUID or an opaque token-shaped segment.
 */
export function parseSessionReference(session: EnterpriseSession): string {
  const candidate =
    session.id?.trim() || lastPathSegment(session.url?.trim() ?? '');
  if (!candidate) {
    throw sessionError(
      'SESSION_REF_INVALID',
      'enterpriseSession requires an id or a verificationUrl',
    );
  }
  if (!UUID_PATTERN.test(candidate) && !OPAQUE_REF_PATTERN.test(candidate)) {
    throw sessionError(
      'SESSION_REF_INVALID',
      'enterpriseSession reference is not a session id or verification URL',
    );
  }
  return candidate;
}

function lastPathSegment(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? '';
  } catch {
    // Not a URL — treat the whole string as a bare reference.
    return url;
  }
}

// Mirrors the hosted page's buildDisclosuresFromConfig + FIELD_TO_SDK_KEY
// (self-dashboard apps/hosted-page .../buildDisclosures.ts): flow-builder
// field names → the boolean disclosure keys webview-app's
// parseDisclosureConfig accepts.
const FIELD_TO_SDK_KEY: Record<string, string> = {
  fullName: 'name',
  documentNumber: 'passport_number',
  dateOfBirth: 'date_of_birth',
  gender: 'gender',
  nationality: 'nationality',
  expirationDate: 'expiry_date',
  issuingState: 'issuing_state',
};

function buildDisclosures(predicatesConfig: Record<string, unknown> | null): {
  disclosures: string[];
  excludedCountries: string[];
} {
  const disclosures = new Set<string>();
  const excludedCountries: string[] = [];
  if (!predicatesConfig) return { disclosures: [], excludedCountries };

  if (typeof predicatesConfig.minimumAge === 'number') {
    disclosures.add(`minimumAge:${predicatesConfig.minimumAge}`);
  }
  if (predicatesConfig.ofac === true) {
    disclosures.add('ofac');
  }
  if (Array.isArray(predicatesConfig.excludedCountries)) {
    for (const country of predicatesConfig.excludedCountries) {
      if (typeof country === 'string') excludedCountries.push(country);
    }
  }
  // An allowlist is enforced verifier-side against the disclosed nationality,
  // so request nationality whenever includedCountries is non-empty.
  if (
    Array.isArray(predicatesConfig.includedCountries) &&
    predicatesConfig.includedCountries.length > 0
  ) {
    disclosures.add('nationality');
  }
  const fieldDisclosures = predicatesConfig.disclosures;
  if (fieldDisclosures && typeof fieldDisclosures === 'object') {
    const enabled = fieldDisclosures as Record<string, unknown>;
    for (const [field, sdkKey] of Object.entries(FIELD_TO_SDK_KEY)) {
      if (enabled[field] === true) disclosures.add(sdkKey);
    }
  }
  return { disclosures: [...disclosures], excludedCountries };
}

/**
 * Resolves a Self Enterprise session into a full VerificationRequest by
 * fetching edge-api's public session endpoint and replicating the hosted
 * page's SelfApp derivation. Throws EnterpriseSessionError.
 *
 * The `userDefinedData` shape is load-bearing: the enterprise verifier's only
 * proof↔session correlation is parsing `{"verificationId":"<id>"}` back out
 * of the proof's userContextData.
 */
export async function resolveEnterpriseSession(
  session: EnterpriseSession,
): Promise<VerificationRequest> {
  const ref = parseSessionReference(session);
  const baseUrl = (session.apiUrl ?? DEFAULT_EDGE_API_URL).replace(/\/$/, '');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/v1/sessions/${encodeURIComponent(ref)}`,
      { signal: controller.signal },
    );
  } catch (err) {
    throw sessionError(
      'SESSION_RESOLVE_FAILED',
      err instanceof Error && err.name === 'AbortError'
        ? 'Session resolve timed out'
        : 'Session resolve request failed',
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 404) {
    throw sessionError('SESSION_NOT_FOUND', 'Verification session not found');
  }
  if (!response.ok) {
    throw sessionError(
      'SESSION_RESOLVE_FAILED',
      `Session resolve failed with HTTP ${response.status}`,
    );
  }

  let info: EnterpriseSessionInfo;
  try {
    info = (await response.json()) as EnterpriseSessionInfo;
  } catch {
    throw sessionError(
      'SESSION_RESOLVE_FAILED',
      'Session response was not JSON',
    );
  }
  if (
    !info ||
    typeof info.orgId !== 'string' ||
    typeof info.externalUuid !== 'string'
  ) {
    throw sessionError(
      'SESSION_RESOLVE_FAILED',
      'Session response is missing required fields',
    );
  }

  if (info.status === 'expired') {
    throw sessionError('SESSION_EXPIRED', 'Verification session has expired');
  }
  if (info.status !== 'pending') {
    throw sessionError(
      'SESSION_ALREADY_PROCESSED',
      'Verification session was already processed',
    );
  }
  // edge-api has no expiry sweeper — stale sessions stay `pending` with a past
  // expiresAt, so the client must evaluate it locally (as the hosted page does).
  const expiresAt = Date.parse(info.expiresAt);
  if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
    throw sessionError('SESSION_EXPIRED', 'Verification session has expired');
  }

  const isStaging = info.environment === 'test';
  const verifierBase = isStaging ? VERIFIER_URL_STAGING : VERIFIER_URL;
  const { disclosures, excludedCountries } = buildDisclosures(
    info.predicatesConfig,
  );
  const sessionId = typeof info.id === 'string' && info.id ? info.id : ref;

  return {
    userId: info.externalUuid,
    userIdType: 'uuid',
    scope: info.orgId.replace(/-/g, '').slice(0, 30),
    appEndpoint: `${verifierBase}/verify`,
    endpointType: isStaging ? 'staging_https' : 'https',
    environment: isStaging ? 'stg' : 'prod',
    appName: info.flowName || 'Self Verification',
    disclosures,
    excludedCountries,
    version: 2,
    verificationId: sessionId,
    userDefinedData: JSON.stringify({ verificationId: sessionId }),
  };
}
