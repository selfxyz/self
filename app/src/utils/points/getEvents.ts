// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { PointEvent, PointEventType } from '@/utils/points/types';

/**
 * Shared helper to get events from store filtered by type.
 */
const getEventsByType = async (type: PointEventType): Promise<PointEvent[]> => {
  try {
    const { usePointEventStore } = await import('@/stores/pointEventStore');
    const events = usePointEventStore.getState().events;
    return events.filter(event => event.type === type);
  } catch (error) {
    console.error(`Error loading ${type} point events:`, error);
    return [];
  }
};

export const getAllPointEvents = async (): Promise<PointEvent[]> => {
  const [disclosures, notifications, backups, referrals] = await Promise.all([
    getDisclosurePointEvents(),
    getPushNotificationPointEvents(),
    getBackupPointEvents(),
    getReferralPointEvents(),
  ]);
  return [...disclosures, ...notifications, ...backups, ...referrals].sort(
    (a, b) => b.timestamp - a.timestamp,
  );
};

export const getBackupPointEvents = async (): Promise<PointEvent[]> => {
  return getEventsByType('backup');
};

export const getDisclosurePointEvents = async (): Promise<PointEvent[]> => {
  return getEventsByType('disclosure');
};

export const getPushNotificationPointEvents = async (): Promise<
  PointEvent[]
> => {
  return getEventsByType('notification');
};

export const getReferralPointEvents = async (): Promise<PointEvent[]> => {
  return getEventsByType('refer');
};
