// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { OperatingMode, VerificationRequestPayload } from '../providers/OperatingModeProvider';
import { hasValidVerificationRequest } from '../providers/OperatingModeProvider';

const TUNNEL_PATH_PREFIX = '/tunnel';
const TUNNEL_HOME_ROUTE = '/tunnel/tour/1';
const WALLET_HOME_ROUTE = '/';
const EMBED_ERROR_ROUTE = '/embed/error';

export interface BootInputs {
  isReady: boolean;
  mode: OperatingMode;
  verificationRequest: VerificationRequestPayload | null;
  pathname: string;
}

export type BootErrorCode = 'INVALID_REQUEST';

export type BootAction =
  | { type: 'wait' }
  | { type: 'noop' }
  | { type: 'navigate'; to: string; replace: true }
  | { type: 'fail-closed'; error: BootErrorCode; errorRoute: string };

/**
 * Pure boot-decision function. Given the boot inputs, returns the single
 * action the boot component should dispatch. No side effects — call sites
 * are responsible for actually navigating / firing bridge calls.
 *
 * Replaces the implicit decision tree previously split across ModeBoot's
 * two `useEffect` hooks. Each branch is independently testable; six
 * test cases cover the full tree (see bootDecision.test.ts).
 */
export function decideBootRoute(input: BootInputs): BootAction {
  if (!input.isReady) return { type: 'wait' };

  if (input.mode === 'embed') {
    if (!hasValidVerificationRequest(input.verificationRequest)) {
      return {
        type: 'fail-closed',
        error: 'INVALID_REQUEST',
        errorRoute: EMBED_ERROR_ROUTE,
      };
    }
    if (!input.pathname.startsWith(TUNNEL_PATH_PREFIX)) {
      return { type: 'navigate', to: TUNNEL_HOME_ROUTE, replace: true };
    }
    return { type: 'noop' };
  }

  // self-app
  if (input.pathname.startsWith(TUNNEL_PATH_PREFIX)) {
    return { type: 'navigate', to: WALLET_HOME_ROUTE, replace: true };
  }
  return { type: 'noop' };
}
