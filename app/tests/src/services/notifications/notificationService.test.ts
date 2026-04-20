// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

jest.unmock('@/services/notifications/notificationService');

// Mock Platform and PermissionsAndroid without requiring react-native to avoid memory issues
// Prefix with 'mock' so Jest allows referencing them in the mock factory
const mockPlatform = {
  OS: 'ios',
  Version: 14,
};

const mockPermissionsAndroid = {
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
  Platform: mockPlatform,
  PermissionsAndroid: mockPermissionsAndroid,
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
    // Reset Platform to default iOS values (using the mock objects directly)
    mockPlatform.OS = 'ios';
    mockPlatform.Version = 14;

    messagingMock = require('@react-native-firebase/messaging').default
      ._instance;
    messagingMock.requestPermission.mockReset();
    messagingMock.getToken.mockReset();
    service = require('@/services/notifications/notificationService');
    (fetch as jest.Mock).mockResolvedValue({ ok: true, text: jest.fn() });
    messagingMock.requestPermission.mockResolvedValue(1);
    messagingMock.getToken.mockResolvedValue('token');
    mockPermissionsAndroid.request.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('requestNotificationPermission', () => {
    it('grants permission on Android', async () => {
      mockPlatform.OS = 'android';
      mockPlatform.Version = 34;
      mockPermissionsAndroid.request.mockResolvedValue('granted');

      const result = await service.requestNotificationPermission();
      expect(result).toBe(true);
      expect(messagingMock.requestPermission).toHaveBeenCalled();
    });

    it('handles denied permission on Android', async () => {
      mockPlatform.OS = 'android';
      mockPlatform.Version = 34;
      mockPermissionsAndroid.request.mockResolvedValue('denied');

      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('handles never_ask_again permission on Android', async () => {
      mockPlatform.OS = 'android';
      mockPlatform.Version = 34;
      mockPermissionsAndroid.request.mockResolvedValue('never_ask_again');

      const result = await service.requestNotificationPermission();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockPlatform.OS = 'ios';
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
      mockPlatform.OS = 'ios';
      const response = { ok: true, text: jest.fn() };
      (fetch as jest.Mock).mockResolvedValue(response);
      await service.registerDeviceToken('123', 'tok', true);
      expect(fetch).toHaveBeenCalledWith(
        'https://notification.staging.self.xyz/register-token',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('retries transport failures and eventually succeeds', async () => {
      jest.useFakeTimers();
      jest.spyOn(Math, 'random').mockReturnValue(0);

      (fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('network down'))
        .mockRejectedValueOnce(new TypeError('still down'))
        .mockResolvedValueOnce({ ok: true, text: jest.fn() });

      const promise = service.registerDeviceToken('123', 'tok', true);

      await jest.runAllTimersAsync();
      await promise;

      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('does not retry abort errors', async () => {
      const abortError = new Error('request aborted');
      abortError.name = 'AbortError';
      (fetch as jest.Mock).mockRejectedValue(abortError);

      await service.registerDeviceToken('123', 'tok', true);

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry server errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('server exploded'),
      });

      await service.registerDeviceToken('123', 'tok', true);

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('aborts a stalled request after the timeout window', async () => {
      jest.useFakeTimers();

      let capturedSignal: AbortSignal | undefined;
      (fetch as jest.Mock).mockImplementation(
        (_url: string, init?: RequestInit) => {
          capturedSignal = init?.signal as AbortSignal | undefined;

          return new Promise((_resolve, reject) => {
            capturedSignal?.addEventListener(
              'abort',
              () => {
                const abortError = new Error('request aborted');
                abortError.name = 'AbortError';
                reject(abortError);
              },
              { once: true },
            );
          });
        },
      );

      const promise = service.registerDeviceToken('123', 'tok', true);

      expect(capturedSignal?.aborted).toBe(false);

      await jest.advanceTimersByTimeAsync(10000);
      await promise;

      expect(capturedSignal?.aborted).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
