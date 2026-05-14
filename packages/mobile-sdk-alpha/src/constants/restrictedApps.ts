// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { DocumentCategory } from '@selfxyz/common/utils/types';

import { GOOGLE_USAT_FAUCET_APP_NAME, GOOGLE_USAT_FAUCET_ENDPOINT, GOOGLE_USAT_FAUCET_SCOPE } from './googleUsat';

/**
 * A RestrictedAppPolicy declares that a verifier app, identified by an
 * (endpoint, scope, appName) triple, requires a constrained set of document
 * categories and excludes mock documents.
 *
 * Add entries to RESTRICTED_APP_REGISTRY to apply the same UX gate to a new
 * partner without changing call-site code. The gate is a UX guard, not a
 * security boundary — server-side checks remain authoritative.
 */
export interface RestrictedAppPolicy {
  /** Stable identifier used in analytics and modal copy lookup. */
  readonly id: string;
  /** Identity to match on. Endpoint comparison is trim+lowercase normalized. */
  readonly match: {
    readonly endpoint: string;
    readonly scope: string;
    readonly appName: string;
  };
  /** Document categories the verifier accepts. Others fail the gate. */
  readonly allowedCategories: ReadonlyArray<DocumentCategory>;
  /** Whether mock documents are accepted by the verifier. */
  readonly allowMock: boolean;
}

export const GOOGLE_USAT_FAUCET_POLICY: RestrictedAppPolicy = {
  id: 'google-usat-faucet',
  match: {
    endpoint: GOOGLE_USAT_FAUCET_ENDPOINT,
    scope: GOOGLE_USAT_FAUCET_SCOPE,
    appName: GOOGLE_USAT_FAUCET_APP_NAME,
  },
  allowedCategories: ['passport', 'id_card', 'aadhaar'],
  allowMock: false,
};

export const RESTRICTED_APP_REGISTRY: ReadonlyArray<RestrictedAppPolicy> = [GOOGLE_USAT_FAUCET_POLICY];
