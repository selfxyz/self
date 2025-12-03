// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type IncomingPoints = {
  amount: number;
  expectedDate: Date;
};

export type PointEvent = {
  id: string;
  title: string;
  type: PointEventType;
  timestamp: number;
  points: number;
  status: PointEventStatus;
};

export type PointEventStatus = 'pending' | 'completed' | 'failed';

export type PointEventType = 'refer' | 'notification' | 'backup' | 'disclosure';

export const POINT_VALUES = {
  disclosure: 8,
  notification: 44,
  backup: 32,
  referrer: 80,
  referee: 24,
} as const;
