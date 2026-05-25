// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useOperatingMode } from '../providers/OperatingModeProvider';
import { useSelfClient } from '../providers/SelfClientProvider';
import type { NavState } from '../types/navState';
import type { Cluster } from './clusterCloseRegistry';
import { CLUSTER_CLOSE, inferClusterFromPath } from './clusterCloseRegistry';

export type {
  Cluster,
  CloseTarget,
  EmbedCloseTarget,
} from './clusterCloseRegistry';
export { CLUSTER_CLOSE, inferClusterFromPath } from './clusterCloseRegistry';

/**
 * Mode-aware cluster-close hook.
 *
 * Returns a stable callback that "closes" the current cluster correctly
 * for whichever operating mode the user is in:
 *   - **self-app**: navigate to the cluster's `selfApp` entry path with
 *     `{ replace: true }`. If the caller passed `state.nextPath`, it
 *     overrides the registry entry (recovery's pre-existing pattern).
 *   - **embed**: call `lifecycle.setResult({success:false, error:'...'})`
 *     when the cluster has one, then `lifecycle.dismiss({reason:'user_cancel'})`.
 *
 * Pass `overrideCluster` to skip the pathname inference (rare).
 */
export function useClusterClose(overrideCluster?: Cluster): () => void {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useOperatingMode();
  const { lifecycle } = useSelfClient();

  return useCallback(() => {
    const cluster = overrideCluster ?? inferClusterFromPath(location.pathname);
    const target = CLUSTER_CLOSE[cluster];

    if (mode === 'embed') {
      if (target.embed.kind === 'set-result') {
        void lifecycle
          .setResult({
            success: false,
            error: {
              code: target.embed.errorCode,
              message: target.embed.errorMessage,
            },
          })
          .catch(() => {
            // Best-effort — host transport may already be torn down.
          });
      }
      lifecycle.dismiss({ reason: 'user_cancel' });
      return;
    }

    const stateNextPath = (location.state as Partial<NavState> | null)?.nextPath;
    navigate(stateNextPath ?? target.selfApp, { replace: true });
  }, [mode, location.pathname, location.state, lifecycle, navigate, overrideCluster]);
}
