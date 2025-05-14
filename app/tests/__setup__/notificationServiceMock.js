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
