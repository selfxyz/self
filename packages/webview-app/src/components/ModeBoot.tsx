// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useBridge } from '../providers/BridgeProvider';
import {
  hasValidVerificationRequest,
  useOperatingMode,
} from '../providers/OperatingModeProvider';

const TUNNEL_PATH_PREFIX = '/tunnel';
const TUNNEL_HOME_ROUTE = '/tunnel/tour/1';
const WALLET_HOME_ROUTE = '/';

/**
 * Mode-aware boot orchestrator. Runs once `OperatingModeProvider` resolves
 * the boot mode signal. Three responsibilities:
 *   1. Tunnel-mode guard: if mode === 'tunnel' but the host did not supply a
 *      valid verificationRequest, emit setResult({ success: false,
 *      errorCode: 'INVALID_REQUEST' }) then dismiss.
 *   2. Initial routing: tunnel boots into /tunnel/tour/1; wallet stays at /.
 *   3. Cross-mode navigation guard: tunnel users that find themselves on
 *      non-/tunnel routes get pulled back into the tunnel; wallet users on
 *      /tunnel/* routes get pulled back home.
 *
 * Renders null. Mounted inside BrowserRouter + OperatingModeProvider in App.
 */
export const ModeBoot: React.FC = () => {
  const { mode, verificationRequest, isReady } = useOperatingMode();
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const tunnelGuardFiredRef = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    if (mode !== 'tunnel') return;
    if (tunnelGuardFiredRef.current) return;
    if (hasValidVerificationRequest(verificationRequest)) return;

    tunnelGuardFiredRef.current = true;
    void (async () => {
      try {
        await bridge.request('lifecycle', 'setResult', {
          success: false,
          errorCode: 'INVALID_REQUEST',
          errorMessage: 'Tunnel mode requires a verificationRequest with userId and scope',
        });
      } catch {
        // Host transport may be unavailable; nothing we can do but proceed.
      }
      try {
        await bridge.request('lifecycle', 'dismiss', {});
      } catch {
        // Best-effort dismiss.
      }
    })();
  }, [bridge, isReady, mode, verificationRequest]);

  useEffect(() => {
    if (!isReady) return;
    const path = location.pathname;

    if (mode === 'tunnel') {
      if (!hasValidVerificationRequest(verificationRequest)) return;
      if (!path.startsWith(TUNNEL_PATH_PREFIX)) {
        navigate(TUNNEL_HOME_ROUTE, { replace: true });
      }
      return;
    }

    if (path.startsWith(TUNNEL_PATH_PREFIX)) {
      navigate(WALLET_HOME_ROUTE, { replace: true });
    }
  }, [isReady, location.pathname, mode, navigate, verificationRequest]);

  return null;
};
