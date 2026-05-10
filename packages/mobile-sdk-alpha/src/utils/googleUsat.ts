// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { SelfApp } from '@selfxyz/common/utils';

import { GOOGLE_USAT_FAUCET_VERIFIERS } from '../constants/googleUsat';

export function isGoogleUsatProofRequest(
  app: SelfApp,
  verifiers: Readonly<Record<number, ReadonlySet<string>>> = GOOGLE_USAT_FAUCET_VERIFIERS,
): boolean {
  if (app.endpointType !== 'celo' && app.endpointType !== 'staging_celo') return false;

  const chainVerifiers = verifiers[app.chainID];
  if (!chainVerifiers || chainVerifiers.size === 0) return false;

  return chainVerifiers.has(app.endpoint.toLowerCase());
}
