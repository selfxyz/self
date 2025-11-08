// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { useEffect, useState } from 'react';

import { usePointEventStore } from '@/stores/pointEventStore';
import {
  getNextSundayNoonUTC,
  getPointsAddress,
  getTotalPoints,
  type IncomingPoints,
} from '@/utils/points';

/*
 * Hook to get incoming points for the user. It shows the optimistic incoming points.
 *
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
    refreshIncomingPoints();
  }, [refreshIncomingPoints]);

  return {
    amount: totalOptimisticIncomingPoints,
    expectedDate: incomingPoints.expectedDate,
  };
};

/*
 * Hook to fetch total points for the user. It refetches the total points when the next points update time is reached (each Sunday noon UTC).
 */
export const usePoints = () => {
  const [truePoints, setTruePoints] = useState({
    points: 0,
  });
  const nextPointsUpdate = getNextSundayNoonUTC().getTime();

  useEffect(() => {
    const fetchPoints = async () => {
      try {
        const address = await getPointsAddress();
        const points = await getTotalPoints(address);
        setTruePoints({ points });
      } catch (error) {
        console.error('Error fetching total points:', error);
      }
    };
    fetchPoints();
    // refresh when points update time changes as its the only time points can change
  }, [nextPointsUpdate]);

  return truePoints.points;
};
