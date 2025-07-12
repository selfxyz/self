// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

jest.unmock('../../src/utils/cameraPermission');

import { PermissionsAndroid, Platform } from 'react-native';

import type { CameraPermissionResult } from '../../src/utils/cameraPermission';

// Mock console.warn to avoid noise in tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
});

describe('cameraPermission', () => {
  let cameraPermission: typeof import('../../src/utils/cameraPermission');

  beforeEach(() => {
    jest.resetModules();
    cameraPermission = require('../../src/utils/cameraPermission');

    // Reset mocks
    (console.warn as jest.Mock).mockClear();
  });

  describe('requestCameraPermission', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'ios',
          writable: true,
        });

        // Mock PermissionsAndroid methods for iOS tests
        PermissionsAndroid.request = jest.fn();
        PermissionsAndroid.check = jest.fn();
      });

      it('returns granted: true on iOS', async () => {
        const result = await cameraPermission.requestCameraPermission();

        expect(result).toEqual({ granted: true });
        expect(PermissionsAndroid.request).not.toHaveBeenCalled();
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'android',
          writable: true,
        });

        // Setup PermissionsAndroid mock
        PermissionsAndroid.request = jest.fn();
        PermissionsAndroid.PERMISSIONS = {
          CAMERA: 'android.permission.CAMERA',
        } as any;
        PermissionsAndroid.RESULTS = { GRANTED: 'granted' } as any;
      });

      it('returns granted: true when permission is granted', async () => {
        (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

        const result = await cameraPermission.requestCameraPermission();

        expect(result).toEqual({ granted: true });
        expect(PermissionsAndroid.request).toHaveBeenCalledWith(
          'android.permission.CAMERA',
          {
            title: 'Camera Permission',
            message:
              'This app needs access to your camera to scan passport documents.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
      });

      it('returns granted: false with error when permission is denied', async () => {
        (PermissionsAndroid.request as jest.Mock).mockResolvedValue('denied');

        const result = await cameraPermission.requestCameraPermission();

        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission denied'),
        });
      });

      it('returns granted: false with error when permission is never_ask_again', async () => {
        (PermissionsAndroid.request as jest.Mock).mockResolvedValue(
          'never_ask_again',
        );

        const result = await cameraPermission.requestCameraPermission();

        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission denied'),
        });
      });

      it('returns granted: false with error when permission request throws', async () => {
        const error = new Error('Permission request failed');
        (PermissionsAndroid.request as jest.Mock).mockRejectedValue(error);

        const result = await cameraPermission.requestCameraPermission();

        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission request failed'),
        });
        expect(console.warn).toHaveBeenCalledWith(
          'Camera permission error:',
          error,
        );
      });
    });
  });

  describe('checkCameraPermission', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'ios',
          writable: true,
        });

        // Mock PermissionsAndroid methods for iOS tests
        PermissionsAndroid.check = jest.fn();
      });

      it('returns true on iOS', async () => {
        const result = await cameraPermission.checkCameraPermission();

        expect(result).toBe(true);
        expect(PermissionsAndroid.check).not.toHaveBeenCalled();
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'android',
          writable: true,
        });

        // Setup PermissionsAndroid mock
        PermissionsAndroid.check = jest.fn();
        PermissionsAndroid.PERMISSIONS = {
          CAMERA: 'android.permission.CAMERA',
        } as any;
      });

      it('returns true when permission is already granted', async () => {
        (PermissionsAndroid.check as jest.Mock).mockResolvedValue(true);

        const result = await cameraPermission.checkCameraPermission();

        expect(result).toBe(true);
        expect(PermissionsAndroid.check).toHaveBeenCalledWith(
          'android.permission.CAMERA',
        );
      });

      it('returns false when permission is not granted', async () => {
        (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);

        const result = await cameraPermission.checkCameraPermission();

        expect(result).toBe(false);
        expect(PermissionsAndroid.check).toHaveBeenCalledWith(
          'android.permission.CAMERA',
        );
      });

      it('returns false when permission check throws', async () => {
        const error = new Error('Permission check failed');
        (PermissionsAndroid.check as jest.Mock).mockRejectedValue(error);

        const result = await cameraPermission.checkCameraPermission();

        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
          'Camera permission check error:',
          error,
        );
      });
    });
  });

  describe('ensureCameraPermission', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'ios',
          writable: true,
        });
      });

      it('returns granted: true on iOS', async () => {
        const result = await cameraPermission.ensureCameraPermission();

        expect(result).toEqual({ granted: true });
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'android',
          writable: true,
        });

        // Setup PermissionsAndroid mock
        PermissionsAndroid.check = jest.fn();
        PermissionsAndroid.request = jest.fn();
        PermissionsAndroid.PERMISSIONS = {
          CAMERA: 'android.permission.CAMERA',
        } as any;
        PermissionsAndroid.RESULTS = { GRANTED: 'granted' } as any;
      });

      it('returns granted: true when permission is already granted', async () => {
        (PermissionsAndroid.check as jest.Mock).mockResolvedValue(true);

        const result = await cameraPermission.ensureCameraPermission();

        expect(result).toEqual({ granted: true });
        expect(PermissionsAndroid.check).toHaveBeenCalledWith(
          'android.permission.CAMERA',
        );
        expect(PermissionsAndroid.request).not.toHaveBeenCalled();
      });

      it('requests permission when not already granted and returns granted: true', async () => {
        (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
        (PermissionsAndroid.request as jest.Mock).mockResolvedValue('granted');

        const result = await cameraPermission.ensureCameraPermission();

        expect(result).toEqual({ granted: true });
        expect(PermissionsAndroid.check).toHaveBeenCalledWith(
          'android.permission.CAMERA',
        );
        expect(PermissionsAndroid.request).toHaveBeenCalledWith(
          'android.permission.CAMERA',
          {
            title: 'Camera Permission',
            message:
              'This app needs access to your camera to scan passport documents.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
      });

      it('requests permission when not already granted and returns granted: false', async () => {
        (PermissionsAndroid.check as jest.Mock).mockResolvedValue(false);
        (PermissionsAndroid.request as jest.Mock).mockResolvedValue('denied');

        const result = await cameraPermission.ensureCameraPermission();

        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission denied'),
        });
        expect(PermissionsAndroid.check).toHaveBeenCalledWith(
          'android.permission.CAMERA',
        );
        expect(PermissionsAndroid.request).toHaveBeenCalled();
      });

      it('handles error when permission check throws', async () => {
        const error = new Error('Permission check failed');
        (PermissionsAndroid.check as jest.Mock).mockRejectedValue(error);

        const result = await cameraPermission.ensureCameraPermission();

        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission denied'),
        });
        expect(console.warn).toHaveBeenCalledWith(
          'Camera permission check error:',
          error,
        );
      });
    });
  });

  describe('CameraPermissionResult interface', () => {
    it('should have the correct structure', () => {
      const result: CameraPermissionResult = {
        granted: true,
      };

      expect(result).toHaveProperty('granted');
      expect(typeof result.granted).toBe('boolean');
    });

    it('should allow optional error property', () => {
      const result: CameraPermissionResult = {
        granted: false,
        error: new Error('Test error'),
      };

      expect(result).toHaveProperty('granted');
      expect(result).toHaveProperty('error');
      expect(result.error).toBeInstanceOf(Error);
    });
  });
});
