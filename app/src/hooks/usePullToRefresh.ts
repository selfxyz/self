// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useCallback, useState } from 'react';

export interface PullToRefresh {
  refreshing: boolean;
  onRefresh: () => void;
}

export function usePullToRefresh(
  refreshAction: () => void | Promise<void>,
): PullToRefresh {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.resolve(refreshAction())
      .catch(error => {
        console.warn('usePullToRefresh: refresh action failed', error);
      })
      .finally(() => setRefreshing(false));
  }, [refreshAction]);

  return { refreshing, onRefresh };
}
