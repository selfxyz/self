import { useEffect, useState } from 'react';

import { usePointEventStore } from '@/stores/pointEventStore';
import {
  getIncomingPoints,
  getNextSundayNoonUTC,
  getPointsAddress,
  getTotalPoints,
  type IncomingPoints,
} from '@/utils/points';

/*
 * Hook to fetch incoming points for the user. It refetches the incoming points when there is a new event in the point events store.
 */
export const useIncomingPoints = (): IncomingPoints | null => {
  const [incomingPoints, setIncomingPoints] = useState<null | IncomingPoints>(
    null,
  );
  const pointEvents = usePointEventStore(state => state.events);
  const pointEventsCount = pointEvents.length;

  useEffect(() => {
    const fetchIncomingPoints = async () => {
      try {
        const points = await getIncomingPoints();
        setIncomingPoints(points);
      } catch (error) {
        console.error('Error fetching incoming points:', error);
      }
    };
    fetchIncomingPoints();
    // when we record a new point event, we want to refetch incoming points
  }, [pointEventsCount]);

  return incomingPoints;
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
