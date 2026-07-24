// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';
import type { DocumentCategory } from '@selfxyz/common/utils/types';

import { RESTRICTED_APP_REGISTRY, type RestrictedAppPolicy } from '../constants/restrictedApps';

// TEMPORARY(SELF-3667): the endpoint clause is disabled so the Google USAT gate
// keeps matching when the faucet's endpoint rotates, without shipping an app
// release each time. Restore `normalizeEndpoint`, the `endpoint` local, and the
// endpoint clause below once the endpoint is driven by Remote Config. SELF-3667.
// function normalizeEndpoint(value: string | undefined): string {
//   return value?.trim().toLowerCase() ?? '';
// }

/**
 * Returns the RestrictedAppPolicy whose identity matches the given SelfApp,
 * or null if none match. scope and appName are exact (case-sensitive) matches.
 *
 * TEMPORARY(SELF-3667): endpoint is intentionally excluded from the match; only
 * scope + appName are compared. See the note above.
 */
export function findRestrictedAppPolicy(
  app: SelfApp,
  registry: ReadonlyArray<RestrictedAppPolicy> = RESTRICTED_APP_REGISTRY,
): RestrictedAppPolicy | null {
  // TEMPORARY(SELF-3667): endpoint check disabled — see note above.
  // const endpoint = normalizeEndpoint(app.endpoint);
  for (const policy of registry) {
    if (
      // endpoint === normalizeEndpoint(policy.match.endpoint) &&
      app.scope === policy.match.scope &&
      app.appName === policy.match.appName
    ) {
      return policy;
    }
  }
  return null;
}

export function isRestrictedAppProofRequest(
  app: SelfApp,
  registry: ReadonlyArray<RestrictedAppPolicy> = RESTRICTED_APP_REGISTRY,
): boolean {
  return findRestrictedAppPolicy(app, registry) !== null;
}

export function isDocumentEligibleForPolicy(
  policy: RestrictedAppPolicy,
  category: DocumentCategory,
  isMock: boolean | undefined,
): boolean {
  if (!policy.allowedCategories.includes(category)) {
    return false;
  }
  if (isMock === true && !policy.allowMock) {
    return false;
  }
  return true;
}

/**
 * Minimal document shape needed for policy eligibility checks. Matches the
 * shape returned by getAllDocuments() — kept narrow so the SDK doesn't pull
 * a heavier document type into this surface.
 */
export interface PolicyEligibleDocument {
  data: {
    documentCategory: DocumentCategory;
    mock?: boolean;
  };
}

/**
 * Returns true if any document in the map (other than `excludedDocumentId`)
 * satisfies the policy's eligibility rules.
 */
export function hasEligibleAlternativeDocumentForPolicy<TDocument extends PolicyEligibleDocument>(
  policy: RestrictedAppPolicy,
  docs: Readonly<Record<string, TDocument>>,
  excludedDocumentId: string,
): boolean {
  for (const [documentId, document] of Object.entries(docs)) {
    if (documentId === excludedDocumentId) continue;
    if (isDocumentEligibleForPolicy(policy, document.data.documentCategory, document.data.mock)) {
      return true;
    }
  }
  return false;
}
