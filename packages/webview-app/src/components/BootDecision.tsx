// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useBridge } from '../providers/BridgeProvider';
import { useOperatingMode } from '../providers/OperatingModeProvider';
import { decideBootRoute } from './decideBootRoute';

/**
 * Mode-aware boot orchestrator. Reads `decideBootRoute` to get a single
 * typed action and dispatches it. On fail-closed (embed mode + invalid
 * request) navigates to `/embed/error` first so the user sees a stable
 * surface while the bridge `setResult` + `dismiss` calls resolve
 * asynchronously.
 *
 * Renders null. Mounted inside BrowserRouter + OperatingModeProvider in App.
 */
const FAIL_CLOSED_MESSAGES: Record<string, string> = {
  INVALID_REQUEST: 'Embed mode requires a verificationRequest with userId and scope',
  UNSUPPORTED_CAPABILITY:
    'This request needs a document capability that is not available on this device',
};

export const BootDecision: React.FC = () => {
  const { mode, verificationRequest, isReady, capabilities } = useOperatingMode();
  const navigate = useNavigate();
  const location = useLocation();
  const bridge = useBridge();
  const failClosedFiredRef = useRef(false);

  useEffect(() => {
    const action = decideBootRoute({
      isReady,
      mode,
      verificationRequest,
      pathname: location.pathname,
      capabilities,
    });

    switch (action.type) {
      case 'wait':
      case 'noop':
        return;
      case 'navigate':
        navigate(action.to, { replace: action.replace });
        return;
      case 'fail-closed':
        if (failClosedFiredRef.current) return;
        failClosedFiredRef.current = true;
        navigate(action.errorRoute, {
          replace: true,
          state: { code: action.error },
        });
        void (async () => {
          try {
            await bridge.request('lifecycle', 'setResult', {
              success: false,
              errorCode: action.error,
              errorMessage: FAIL_CLOSED_MESSAGES[action.error] ?? FAIL_CLOSED_MESSAGES.INVALID_REQUEST,
            });
          } catch {
            // Host transport may be unavailable; the /embed/error route holds the UI.
          }
          try {
            await bridge.request('lifecycle', 'dismiss', { reason: 'invalid_request' });
          } catch {
            // Best-effort dismiss.
          }
        })();
        return;
    }
  }, [bridge, isReady, mode, verificationRequest, capabilities, location.pathname, navigate]);

  return null;
};
