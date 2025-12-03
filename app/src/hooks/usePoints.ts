// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect } from 'react';

import { getNextSundayNoonUTC, type IncomingPoints } from '@/services/points';
import { usePointEventStore } from '@/stores/pointEventStore';

/*
 * Hook to get incoming points for the user. It shows the optimistic incoming points.
 * Refreshes incoming points once on mount.
 */
export const useIncomingPoints = (): IncomingPoints => {
  const incomingPoints = usePointEventStore(state => state.incomingPoints);
  const totalOptimisticIncomingPoints = usePointEventStore(state =>
    state.totalOptimisticIncomingPoints(),
  );
  const refreshIncomingPoints = usePointEventStore(
    state => state.refreshIncomingPoints,
  );

  useEffect(() => {
    // Only refresh once on mount - the store handles promise caching for concurrent calls
    refreshIncomingPoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: only run once on mount

  return {
    amount: totalOptimisticIncomingPoints,
    expectedDate: incomingPoints.expectedDate,
  };
};

/*
 * Hook to fetch total points for the user. It refetches the total points when the next points update time is reached (each Sunday noon UTC).
 */
export const usePoints = () => {
  const points = usePointEventStore(state => state.points);
  const nextPointsUpdate = getNextSundayNoonUTC().getTime();
  const refreshPoints = usePointEventStore(state => state.refreshPoints);

  useEffect(() => {
    refreshPoints();
    // refresh when points update time changes as its the only time points can change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextPointsUpdate]);

  return {
    amount: points,
    refetch: refreshPoints,
  };
};
