// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type React from 'react';
import { useEffect, useRef } from 'react';
import { Navigate, Route } from 'react-router-dom';

import { useOperatingMode } from '../providers/OperatingModeProvider';
import { useSelfClient } from '../providers/SelfClientProvider';

export type RouteMode = 'self-app' | 'embed' | 'shared' | 'dev';

interface ModeRouteProps {
  mode: RouteMode;
  path: string;
  element: React.ReactNode;
}

/**
 * Mode-aware route declaration. Returns a real `<Route>` so it can sit
 * directly under `<Routes>` (react-router requires Route as a direct child).
 *
 * Mode semantics (locked in DECISIONS.md → nav-13-q2):
 *   - `shared` / `dev`     → always render element.
 *   - matching mode        → render element.
 *   - self-app on embed    → redirect to "/".
 *   - embed on self-app    → `lifecycle.setResult({success:false,
 *                            error:{code:'route_not_allowed'}})` then
 *                            `lifecycle.dismiss({reason:'route_not_allowed'})`.
 *
 * Used as a function call in JSX:
 *   {ModeRoute({ mode: 'shared', path: '/tour/:step', element: <TourScreen /> })}
 */
export function ModeRoute({ mode, path, element }: ModeRouteProps): React.JSX.Element {
  return <Route path={path} element={<ModeRouteGate mode={mode}>{element}</ModeRouteGate>} />;
}

interface ModeRouteGateProps {
  mode: RouteMode;
  children: React.ReactNode;
}

export const ModeRouteGate: React.FC<ModeRouteGateProps> = ({ mode, children }) => {
  const { mode: currentMode } = useOperatingMode();

  if (mode === 'shared' || mode === 'dev') {
    return <>{children}</>;
  }

  if (mode === currentMode) {
    return <>{children}</>;
  }

  return <ModeMismatchHandler routeMode={mode} />;
};

interface ModeMismatchHandlerProps {
  routeMode: RouteMode;
}

const ModeMismatchHandler: React.FC<ModeMismatchHandlerProps> = ({ routeMode }) => {
  const { mode: currentMode } = useOperatingMode();
  const { lifecycle } = useSelfClient();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (routeMode === 'self-app' && currentMode === 'embed') {
      firedRef.current = true;
      void (async () => {
        try {
          await lifecycle.setResult({
            success: false,
            error: {
              code: 'route_not_allowed',
              message: 'This route is not available in embed mode.',
            },
          });
        } catch {
          // Best-effort — host transport may already be torn down.
        }
        try {
          await lifecycle.dismiss({ reason: 'user_cancel' });
        } catch {
          // Best-effort dismiss.
        }
      })();
    }
  }, [routeMode, currentMode, lifecycle]);

  if (routeMode === 'embed' && currentMode === 'self-app') {
    return <Navigate to="/" replace />;
  }

  return null;
};
