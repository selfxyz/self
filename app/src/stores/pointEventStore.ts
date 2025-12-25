// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  IncomingPoints,
  PointEvent,
  PointEventType,
} from '@/services/points';
import {
  getIncomingPoints,
  getNextSundayNoonUTC,
  getPointsAddress,
  getTotalPoints,
} from '@/services/points';
import { pollEventProcessingStatus } from '@/services/points/eventPolling';

interface PointEventState {
  events: PointEvent[];
  isLoading: boolean;
  loadEvents: () => Promise<void>;
  loadDisclosureEvents: () => Promise<void>;
  addEvent: (
    title: string,
    type: PointEventType,
    points: number,
    id: string,
  ) => Promise<void>;
  markEventAsProcessed: (id: string) => Promise<void>;
  markEventAsFailed: (id: string) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  clearEvents: () => Promise<void>;
  getUnprocessedEvents: () => PointEvent[];
  totalOptimisticIncomingPoints: () => number;
  incomingPoints: IncomingPoints & {
    lastUpdated: number | null;
    promise: Promise<IncomingPoints | null> | null;
  };
  points: number;
  refreshPoints: () => Promise<void>;
  fetchIncomingPoints: () => Promise<IncomingPoints | null>;
  refreshIncomingPoints: () => Promise<void>;
  getAllPointEvents: () => PointEvent[];
}

const STORAGE_KEY = '@point_events';

const DESIRED_EVENT_TYPES = ['refer', 'notification', 'backup', 'disclosure'];

export const usePointEventStore = create<PointEventState>()((set, get) => ({
  incomingPoints: {
    amount: 0,
    lastUpdated: null,
    promise: null,
    expectedDate: getNextSundayNoonUTC(),
  },
  points: 0,
  events: [],
  isLoading: false,
  refreshPoints: async () => {
    try {
      const address = await getPointsAddress();
      const points = await getTotalPoints(address);
      set({ points });
    } catch (error) {
      console.error('Error refreshing points:', error);
    }
  },
  // should only be called once on app startup
  getAllPointEvents: () => {
    return get()
      .events.filter(event => DESIRED_EVENT_TYPES.includes(event.type))
      .sort((a, b) => b.timestamp - a.timestamp);
  },
  loadEvents: async () => {
    try {
      set({ isLoading: true });
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!Array.isArray(parsed)) {
            console.error('Invalid stored events format, expected array');
            set({ events: [], isLoading: false });
            return;
          }
          const events: PointEvent[] = parsed.filter((event: unknown) => {
            if (
              typeof event === 'object' &&
              event !== null &&
              'id' in event &&
              'status' in event &&
              'points' in event
            ) {
              return true;
            }
            console.warn('Skipping invalid event:', event);
            return false;
          }) as PointEvent[];
          set({ events, isLoading: false });
          get()
            .getUnprocessedEvents()
            .forEach(event => {
              pollEventProcessingStatus(event.id).then(result => {
                if (result === 'completed') {
                  get().markEventAsProcessed(event.id);
                } else if (result === 'failed') {
                  get().markEventAsFailed(event.id);
                }
              });
            });
        } catch (parseError) {
          console.error('Error parsing stored events:', parseError);
          await AsyncStorage.removeItem(STORAGE_KEY);
          set({ events: [], isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
      await get().loadDisclosureEvents();
    } catch (error) {
      console.error('Error loading point events:', error);
      set({ isLoading: false });
    }
  },

  loadDisclosureEvents: async () => {
    try {
      const { getDisclosurePointEvents } =
        await import('@/services/points/getEvents');
      const { useProofHistoryStore } =
        await import('@/stores/proofHistoryStore');
      await useProofHistoryStore.getState().initDatabase();
      const disclosureEvents = await getDisclosurePointEvents();
      const existingEvents = get().events.filter(e => e.type !== 'disclosure');
      set({ events: [...existingEvents, ...disclosureEvents] });
    } catch (error) {
      console.error('Error loading disclosure events:', error);
    }
  },

  fetchIncomingPoints: async () => {
    if (get().incomingPoints.promise) {
      return await get().incomingPoints.promise;
    }
    const promise = getIncomingPoints();
    set({
      incomingPoints: {
        ...get().incomingPoints,
        promise: promise,
      },
    });
    try {
      const points = await promise;
      return points;
    } finally {
      // Clear promise after completion (success or failure)
      // Only clear if it's still the same promise (no concurrent update)
      if (get().incomingPoints.promise === promise) {
        set({
          incomingPoints: {
            ...get().incomingPoints,
            promise: null,
          },
        });
      }
    }
  },
  /*
   * Fetches incoming points from the backend and updates the store.
   * @param otherState Optional additional state to merge into incomingPoints. so they can be updated atomically.
   */
  refreshIncomingPoints: async () => {
    // Avoid concurrent updates
    if (get().incomingPoints.promise) {
      return;
    }

    // Fetch incoming points
    try {
      const points = await get().fetchIncomingPoints();
      if (points === null) {
        // Fetch failed, promise already cleared by fetchIncomingPoints
        return;
      }
      // points are not saved to local storage as that would lead to stale data
      // Refresh expectedDate to ensure it's current
      set({
        incomingPoints: {
          ...get().incomingPoints,
          lastUpdated: Date.now(),
          amount: points.amount,
          promise: null, // Already cleared by fetchIncomingPoints, but ensure it's null
          expectedDate: points.expectedDate,
        },
      });
    } catch (error) {
      console.error('Error refreshing incoming points:', error);
      // Promise already cleared by fetchIncomingPoints in finally block
    }
  },
  getUnprocessedEvents: () => {
    return get().events.filter(event => event.status === 'pending');
  },
  /*
   * Calculates the total optimistic incoming points based on the current events.
   */
  totalOptimisticIncomingPoints: () => {
    // todo: fix the optimistic approach - should add unprocessed event points
    return get().incomingPoints.amount;
  },

  addEvent: async (title, type, points, id) => {
    try {
      const newEvent: PointEvent = {
        id,
        title,
        type,
        timestamp: Date.now(),
        points,
        status: 'pending',
      };

      const currentEvents = get().events;
      const updatedEvents = [newEvent, ...currentEvents];

      // Save to storage first, then update state to maintain consistency
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
      set({ events: updatedEvents });
    } catch (error) {
      console.error('Error adding point event:', error);
      // Don't update state if storage fails - maintain consistency
      throw error; // Re-throw so caller knows it failed
    }
  },

  markEventAsProcessed: async (id: string) => {
    try {
      // Re-read events to avoid race conditions with concurrent updates
      const currentEvents = get().events;
      // Check if event still exists and is still pending
      const event = currentEvents.find(e => e.id === id);
      if (!event) {
        console.warn(`Event ${id} not found when marking as processed`);
        return;
      }
      if (event.status !== 'pending') {
        // Already processed, skip
        return;
      }

      const updatedEvents = currentEvents.map(e =>
        e.id === id ? { ...e, status: 'completed' as const } : e,
      );
      // Fetch fresh incoming points from server while saving events to storage
      // points are not saved to local storage as that would lead to stale data
      // Use fetchIncomingPoints to reuse promise caching and avoid race conditions
      const [points] = await Promise.all([
        get().fetchIncomingPoints(),
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents)),
      ]);

      // Re-check events haven't changed during async operations
      const latestEvents = get().events;
      const latestEvent = latestEvents.find(e => e.id === id);
      if (latestEvent && latestEvent.status !== 'pending') {
        // Event was already updated by another call, merge updates carefully
        const finalEvents = latestEvents.map(e =>
          e.id === id ? { ...e, status: 'completed' as const } : e,
        );
        set({ events: finalEvents });
      } else {
        // Atomically update both events and incoming points in single state update
        if (points !== null) {
          set({
            events: updatedEvents,
            incomingPoints: {
              ...get().incomingPoints,
              promise: null,
              lastUpdated: Date.now(),
              amount: points.amount,
              expectedDate: points.expectedDate,
            },
          });
        } else {
          // If fetch failed, just update events
          set({ events: updatedEvents });
        }
      }
    } catch (error) {
      console.error('Error marking point event as processed:', error);
      // Don't update state if storage fails
    }
  },

  markEventAsFailed: async (id: string) => {
    try {
      const currentEvents = get().events;
      const event = currentEvents.find(e => e.id === id);
      if (!event) {
        console.warn(`Event ${id} not found when marking as failed`);
        return;
      }
      if (event.status !== 'pending') {
        // Already processed, skip
        return;
      }

      const updatedEvents = currentEvents.map(e =>
        e.id === id ? { ...e, status: 'failed' as const } : e,
      );

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
      set({ events: updatedEvents });
    } catch (error) {
      console.error('Error marking point event as failed:', error);
      // Don't update state if storage fails
    }
  },

  removeEvent: async id => {
    try {
      const currentEvents = get().events;
      const updatedEvents = currentEvents.filter(event => event.id !== id);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
      set({ events: updatedEvents });
    } catch (error) {
      console.error('Error removing point event:', error);
    }
  },

  clearEvents: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      set({ events: [] });
    } catch (error) {
      console.error('Error clearing point events:', error);
    }
  },
}));
