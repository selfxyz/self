// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

jest.unmock('@/utils/notifications/notificationService');

// Mock Platform and PermissionsAndroid without requiring react-native to avoid memory issues
const Platform = {
  OS: 'ios',
  Version: 14,
};

const PermissionsAndroid = {
  request: jest.fn(),
  PERMISSIONS: {
    POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
};

jest.mock('react-native', () => ({
  Platform,
  PermissionsAndroid,
}));

jest.mock('@react-native-firebase/messaging', () => {
  const instance = {
    requestPermission: jest.fn(),
    getToken: jest.fn(),
  };
  const mockFn = () => instance;
  mockFn._instance = instance;
  mockFn.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
  return { __esModule: true, default: mockFn };
});

let messagingMock: {
  requestPermission: jest.Mock;
  getToken: jest.Mock;
};

global.fetch = jest.fn();

describe('notificationService', () => {
  let service: any; // Using any here since we're dynamically requiring the module in tests

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform to default iOS values
    Platform.OS = 'ios';
    Platform.Version = 14;

    messagingMock = require('@react-native-firebase/messaging').default
      ._instance;
    messagingMock.requestPermission.mockClear();
    messagingMock.getToken.mockClear();
    service = require('@/utils/notifications/notificationService');
    (fetch as jest.Mock).mockResolvedValue({ ok: true, text: jest.fn() });
    messagingMock.requestPermission.mockResolvedValue(1);
    messagingMock.getToken.mockResolvedValue('token');
    (PermissionsAndroid.request as jest.Mock).mockClear();
  });

  describe('requestNotificationPermission', () => {
    it('grants permission on Android', async () => {
      Platform.OS = 'android';
      Platform.Version = 34;
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

      const result = await service.requestNotificationPermission();
      expect(result).toBe(true);
      expect(messagingMock.requestPermission).toHaveBeenCalled();
    });

    it('handles denied permission on Android', async () => {
      Platform.OS = 'android';
      Platform.Version = 34;
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue('denied');

      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('handles never_ask_again permission on Android', async () => {
      Platform.OS = 'android';
      Platform.Version = 34;
      (PermissionsAndroid.request as jest.Mock).mockResolvedValue(
        'never_ask_again',
      );

      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      Platform.OS = 'ios';
      messagingMock.requestPermission.mockRejectedValueOnce(new Error('fail'));
      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });
  });

  describe('getFCMToken', () => {
    it('returns token', async () => {
      messagingMock.getToken.mockResolvedValueOnce('abc');
      const token = await service.getFCMToken();
      expect(token).toBe('abc');
    });

    it('returns null when error', async () => {
      messagingMock.getToken.mockRejectedValueOnce(new Error('err'));
      const token = await service.getFCMToken();
      expect(token).toBeNull();
    });
  });

  describe('registerDeviceToken', () => {
    it('posts token', async () => {
      Platform.OS = 'ios';
      const response = { ok: true, text: jest.fn() };
      (fetch as jest.Mock).mockResolvedValue(response);
      await service.registerDeviceToken('123', 'tok', true);
      expect(fetch).toHaveBeenCalledWith(
        'https://notification.staging.self.xyz/register-token',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
