// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';

import {
  GOOGLE_USAT_FAUCET_APP_NAME,
  GOOGLE_USAT_FAUCET_ENDPOINT,
  GOOGLE_USAT_FAUCET_SCOPE,
} from '../constants/googleUsat';

export interface GoogleUsatFaucetIdentity {
  endpoint: string;
  scope: string;
  appName: string;
}

export const GOOGLE_USAT_FAUCET_IDENTITY: GoogleUsatFaucetIdentity = {
  endpoint: GOOGLE_USAT_FAUCET_ENDPOINT,
  scope: GOOGLE_USAT_FAUCET_SCOPE,
  appName: GOOGLE_USAT_FAUCET_APP_NAME,
};

export function isGoogleUsatProofRequest(
  app: SelfApp,
  identity: GoogleUsatFaucetIdentity = GOOGLE_USAT_FAUCET_IDENTITY,
): boolean {
  return (
    app.endpoint?.trim().toLowerCase() === identity.endpoint.toLowerCase() &&
    app.scope === identity.scope &&
    app.appName === identity.appName
  );
}
