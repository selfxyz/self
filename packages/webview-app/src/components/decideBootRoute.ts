// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { OperatingMode, VerificationRequestPayload } from '../providers/OperatingModeProvider';
import { hasValidVerificationRequest } from '../providers/OperatingModeProvider';

const EMBED_HOME_ROUTE = '/tour/1';
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
 * After NAV-08 + NAV-13: paths no longer carry mode-coupling via prefix.
 * The cross-mode reroute (self-app user on an embed route) is now handled
 * by `<ModeRoute>` at the routing layer; BootDecision only handles the
 * boot-time decisions (initial nav + fail-closed on missing request).
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
    if (input.pathname === '/' || input.pathname === '') {
      return { type: 'navigate', to: EMBED_HOME_ROUTE, replace: true };
    }
    return { type: 'noop' };
  }

  // self-app — no path-based reroute. `<ModeRoute>` enforces embed-only
  // route rejection from self-app at render time.
  return { type: 'noop' };
}
