//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

/* global jest */

// Mock for notificationService.ts
export const getStateMessage = jest.fn().mockImplementation(state => {
  return 'Mock state message';
});

export const requestNotificationPermission = jest.fn().mockResolvedValue(true);

export const getFCMToken = jest.fn().mockResolvedValue('mock-fcm-token');

export const registerDeviceToken = jest.fn().mockResolvedValue();

export const setupNotifications = jest.fn().mockReturnValue(jest.fn());

export const RemoteMessage = {};
