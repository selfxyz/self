// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PointEvent, PointEventType } from '@/utils/points';

interface PointEventState {
  events: PointEvent[];
  isLoading: boolean;
  loadEvents: () => Promise<void>;
  addEvent: (
    title: string,
    type: PointEventType,
    points: number,
  ) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  clearEvents: () => Promise<void>;
}

const STORAGE_KEY = '@point_events';

export const usePointEventStore = create<PointEventState>()((set, get) => ({
  events: [],
  isLoading: false,

  loadEvents: async () => {
    try {
      set({ isLoading: true });
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const events = JSON.parse(stored);
        set({ events, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Error loading point events:', error);
      set({ isLoading: false });
    }
  },

  addEvent: async (title, type, points) => {
    try {
      const newEvent: PointEvent = {
        id: `${type}-${Date.now()}`,
        title,
        type,
        timestamp: Date.now(),
        points,
      };

      const currentEvents = get().events;
      const updatedEvents = [newEvent, ...currentEvents];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
      set({ events: updatedEvents });
    } catch (error) {
      console.error('Error adding point event:', error);
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
