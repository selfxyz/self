// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

export const RemoteMessage = {};

export const getFCMToken = jest.fn().mockResolvedValue('mock-fcm-token');

/* global jest */
// Mock for notificationService.ts
export const getStateMessage = jest.fn().mockImplementation(() => {
  return 'Mock state message';
});

export const registerDeviceToken = jest.fn().mockResolvedValue();

export const requestNotificationPermission = jest.fn().mockResolvedValue(true);

export const setupNotifications = jest.fn().mockReturnValue(jest.fn());
