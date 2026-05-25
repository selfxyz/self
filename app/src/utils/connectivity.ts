// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { NetInfoState } from '@react-native-community/netinfo';

export type ConnectivityBannerState = 'offline' | 'online' | 'weak';

type ConnectivityStateSnapshot = Pick<
  NetInfoState,
  'details' | 'isConnected' | 'isInternetReachable' | 'type'
>;

const WEAK_CELLULAR_GENERATIONS = new Set(['2g', '3g']);

export function getConnectivityBannerState(
  state: ConnectivityStateSnapshot,
): ConnectivityBannerState {
  if (state.isConnected === false || state.isInternetReachable === false) {
    return 'offline';
  }

  if (state.type === 'cellular') {
    const details = state.details as
      | { cellularGeneration?: string | null }
      | null
      | undefined;
    const cellularGeneration = details?.cellularGeneration;
    if (
      cellularGeneration &&
      WEAK_CELLULAR_GENERATIONS.has(cellularGeneration)
    ) {
      return 'weak';
    }
  }

  return 'online';
}
