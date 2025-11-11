// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

jest.unmock('@/utils/notifications/notificationService');

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

let messagingMock: ReturnType<typeof jest.fn>;
let PermissionsAndroid: any;
let Platform: any;

global.fetch = jest.fn();

describe('notificationService', () => {
  let service: any; // Using any here since we're dynamically requiring the module in tests

  beforeEach(() => {
    jest.resetModules();
    // Load React Native modules dynamically to avoid hermes-parser WASM memory issues
    const RN = require('react-native');
    PermissionsAndroid = RN.PermissionsAndroid;
    Platform = RN.Platform;

    messagingMock = require('@react-native-firebase/messaging').default
      ._instance;
    messagingMock.requestPermission.mockReset();
    messagingMock.getToken.mockReset();
    service = require('@/utils/notifications/notificationService');
    (fetch as jest.Mock).mockResolvedValue({ ok: true, text: jest.fn() });
    messagingMock.requestPermission.mockResolvedValue(1);
    messagingMock.getToken.mockResolvedValue('token');
    (PermissionsAndroid.request as jest.Mock | undefined)?.mockReset?.();
  });

  describe('requestNotificationPermission', () => {
    it('grants permission on Android', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });
      Object.defineProperty(Platform, 'Version', {
        value: 34,
        writable: true,
      });
      PermissionsAndroid.request = jest.fn().mockResolvedValue('granted');
      PermissionsAndroid.PERMISSIONS = {
        POST_NOTIFICATIONS: 'post',
      } as typeof PermissionsAndroid.PERMISSIONS;
      PermissionsAndroid.RESULTS = {
        GRANTED: 'granted',
      } as typeof PermissionsAndroid.RESULTS;

      const result = await service.requestNotificationPermission();
      expect(result).toBe(true);
      expect(messagingMock.requestPermission).toHaveBeenCalled();
    });

    it('handles denied permission on Android', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });
      Object.defineProperty(Platform, 'Version', {
        value: 34,
        writable: true,
      });
      PermissionsAndroid.request = jest.fn().mockResolvedValue('denied');
      PermissionsAndroid.PERMISSIONS = {
        POST_NOTIFICATIONS: 'post',
      } as typeof PermissionsAndroid.PERMISSIONS;
      PermissionsAndroid.RESULTS = {
        GRANTED: 'granted',
        DENIED: 'denied',
      } as typeof PermissionsAndroid.RESULTS;

      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('handles never_ask_again permission on Android', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });
      Object.defineProperty(Platform, 'Version', {
        value: 34,
        writable: true,
      });
      PermissionsAndroid.request = jest
        .fn()
        .mockResolvedValue('never_ask_again');
      PermissionsAndroid.PERMISSIONS = {
        POST_NOTIFICATIONS: 'post',
      } as typeof PermissionsAndroid.PERMISSIONS;
      PermissionsAndroid.RESULTS = {
        GRANTED: 'granted',
        NEVER_ASK_AGAIN: 'never_ask_again',
      } as typeof PermissionsAndroid.RESULTS;

      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
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
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
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
