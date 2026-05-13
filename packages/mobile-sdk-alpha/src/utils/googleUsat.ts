// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';

import { GOOGLE_USAT_FAUCET_POLICY } from '../constants/restrictedApps';
import { findRestrictedAppPolicy } from './restrictedApps';

export interface GoogleUsatFaucetIdentity {
  endpoint: string;
  scope: string;
  appName: string;
}

export const GOOGLE_USAT_FAUCET_IDENTITY: GoogleUsatFaucetIdentity = {
  endpoint: GOOGLE_USAT_FAUCET_POLICY.match.endpoint,
  scope: GOOGLE_USAT_FAUCET_POLICY.match.scope,
  appName: GOOGLE_USAT_FAUCET_POLICY.match.appName,
};

/**
 * Matches the Google USAT faucet app by identity. Backed by the
 * RESTRICTED_APP_REGISTRY — for general restricted-app matching prefer
 * findRestrictedAppPolicy(). This function exists so existing call sites
 * continue to compile unchanged.
 */
export function isGoogleUsatProofRequest(
  app: SelfApp,
  identity: GoogleUsatFaucetIdentity = GOOGLE_USAT_FAUCET_IDENTITY,
): boolean {
  const matched = findRestrictedAppPolicy(app, [
    {
      id: GOOGLE_USAT_FAUCET_POLICY.id,
      match: identity,
      allowedCategories: GOOGLE_USAT_FAUCET_POLICY.allowedCategories,
      allowMock: GOOGLE_USAT_FAUCET_POLICY.allowMock,
    },
  ]);
  return matched !== null;
}
