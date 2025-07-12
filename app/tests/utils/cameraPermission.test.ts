// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

jest.unmock('../../src/utils/cameraPermission');

import { Platform } from 'react-native';

import type { CameraPermissionResult } from '../../src/utils/cameraPermission';

// Mock react-native-permissions
const mockCheck = jest.fn();
const mockRequest = jest.fn();
const mockPermissions = {
  IOS: {
    CAMERA: 'ios.permission.CAMERA',
  },
  ANDROID: {
    CAMERA: 'android.permission.CAMERA',
  },
};
const mockResults = {
  GRANTED: 'granted',
  DENIED: 'denied',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
};

jest.mock('react-native-permissions', () => ({
  check: mockCheck,
  request: mockRequest,
  PERMISSIONS: mockPermissions,
  RESULTS: mockResults,
}));

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
    (console.warn as jest.Mock).mockClear();
    mockCheck.mockClear();
    mockRequest.mockClear();
  });

  describe('requestCameraPermission', () => {
    describe('iOS', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'ios',
          writable: true,
        });
        // Mock Platform.select to return iOS permission
        jest.spyOn(Platform, 'select').mockImplementation(obj => obj.ios);
      });

      it('returns granted: true when permission is already granted', async () => {
        mockCheck.mockResolvedValue('granted');
        const result = await cameraPermission.requestCameraPermission();
        expect(result).toEqual({ granted: true });
        expect(mockCheck).toHaveBeenCalledWith('ios.permission.CAMERA');
        expect(mockRequest).not.toHaveBeenCalled();
      });

      it('requests permission and returns granted: true when permission is granted', async () => {
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockResolvedValue('granted');
        const result = await cameraPermission.requestCameraPermission();
        expect(result).toEqual({ granted: true });
        expect(mockCheck).toHaveBeenCalledWith('ios.permission.CAMERA');
        expect(mockRequest).toHaveBeenCalledWith('ios.permission.CAMERA');
      });

      it('requests permission and returns granted: false when permission is denied', async () => {
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockResolvedValue('denied');
        const result = await cameraPermission.requestCameraPermission();
        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission denied'),
        });
        expect(mockCheck).toHaveBeenCalledWith('ios.permission.CAMERA');
        expect(mockRequest).toHaveBeenCalledWith('ios.permission.CAMERA');
      });

      it('returns granted: false with error when permission check throws', async () => {
        const error = new Error('Permission check failed');
        mockCheck.mockRejectedValue(error);
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

      it('returns granted: false with error when permission request throws', async () => {
        const error = new Error('Permission request failed');
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockRejectedValue(error);
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

    describe('Android', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'android',
          writable: true,
        });
        // Mock Platform.select to return Android permission
        jest.spyOn(Platform, 'select').mockImplementation(obj => obj.android);
      });

      it('returns granted: true when permission is already granted', async () => {
        mockCheck.mockResolvedValue('granted');
        const result = await cameraPermission.requestCameraPermission();
        expect(result).toEqual({ granted: true });
        expect(mockCheck).toHaveBeenCalledWith('android.permission.CAMERA');
        expect(mockRequest).not.toHaveBeenCalled();
      });

      it('requests permission and returns granted: true when permission is granted', async () => {
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockResolvedValue('granted');
        const result = await cameraPermission.requestCameraPermission();
        expect(result).toEqual({ granted: true });
        expect(mockCheck).toHaveBeenCalledWith('android.permission.CAMERA');
        expect(mockRequest).toHaveBeenCalledWith('android.permission.CAMERA');
      });

      it('requests permission and returns granted: false when permission is denied', async () => {
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockResolvedValue('denied');
        const result = await cameraPermission.requestCameraPermission();
        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission denied'),
        });
        expect(mockCheck).toHaveBeenCalledWith('android.permission.CAMERA');
        expect(mockRequest).toHaveBeenCalledWith('android.permission.CAMERA');
      });

      it('returns granted: false with error when permission check throws', async () => {
        const error = new Error('Permission check failed');
        mockCheck.mockRejectedValue(error);
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

      it('returns granted: false with error when permission request throws', async () => {
        const error = new Error('Permission request failed');
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockRejectedValue(error);
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
        // Mock Platform.select to return iOS permission
        jest.spyOn(Platform, 'select').mockImplementation(obj => obj.ios);
      });

      it('returns true when permission is granted', async () => {
        mockCheck.mockResolvedValue('granted');
        const result = await cameraPermission.checkCameraPermission();
        expect(result).toBe(true);
        expect(mockCheck).toHaveBeenCalledWith('ios.permission.CAMERA');
      });

      it('returns false when permission is not granted', async () => {
        mockCheck.mockResolvedValue('denied');
        const result = await cameraPermission.checkCameraPermission();
        expect(result).toBe(false);
        expect(mockCheck).toHaveBeenCalledWith('ios.permission.CAMERA');
      });

      it('returns false when permission check throws', async () => {
        const error = new Error('Permission check failed');
        mockCheck.mockRejectedValue(error);
        const result = await cameraPermission.checkCameraPermission();
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalledWith(
          'Camera permission check error:',
          error,
        );
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'android',
          writable: true,
        });
        // Mock Platform.select to return Android permission
        jest.spyOn(Platform, 'select').mockImplementation(obj => obj.android);
      });

      it('returns true when permission is granted', async () => {
        mockCheck.mockResolvedValue('granted');
        const result = await cameraPermission.checkCameraPermission();
        expect(result).toBe(true);
        expect(mockCheck).toHaveBeenCalledWith('android.permission.CAMERA');
      });

      it('returns false when permission is not granted', async () => {
        mockCheck.mockResolvedValue('denied');
        const result = await cameraPermission.checkCameraPermission();
        expect(result).toBe(false);
        expect(mockCheck).toHaveBeenCalledWith('android.permission.CAMERA');
      });

      it('returns false when permission check throws', async () => {
        const error = new Error('Permission check failed');
        mockCheck.mockRejectedValue(error);
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
        // Mock Platform.select to return iOS permission
        jest.spyOn(Platform, 'select').mockImplementation(obj => obj.ios);
      });

      it('returns granted: true when permission is already granted', async () => {
        mockCheck.mockResolvedValue('granted');
        const result = await cameraPermission.ensureCameraPermission();
        expect(result).toEqual({ granted: true });
        expect(mockCheck).toHaveBeenCalledWith('ios.permission.CAMERA');
        expect(mockRequest).not.toHaveBeenCalled();
      });

      it('requests permission when not already granted and returns granted: true', async () => {
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockResolvedValue('granted');
        const result = await cameraPermission.ensureCameraPermission();
        expect(result).toEqual({ granted: true });
        expect(mockCheck).toHaveBeenCalledWith('ios.permission.CAMERA');
        expect(mockRequest).toHaveBeenCalledWith('ios.permission.CAMERA');
      });

      it('requests permission when not already granted and returns granted: false', async () => {
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockResolvedValue('denied');
        const result = await cameraPermission.ensureCameraPermission();
        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission denied'),
        });
        expect(mockCheck).toHaveBeenCalledWith('ios.permission.CAMERA');
        expect(mockRequest).toHaveBeenCalledWith('ios.permission.CAMERA');
      });
    });

    describe('Android', () => {
      beforeEach(() => {
        Object.defineProperty(Platform, 'OS', {
          value: 'android',
          writable: true,
        });
        // Mock Platform.select to return Android permission
        jest.spyOn(Platform, 'select').mockImplementation(obj => obj.android);
      });

      it('returns granted: true when permission is already granted', async () => {
        mockCheck.mockResolvedValue('granted');
        const result = await cameraPermission.ensureCameraPermission();
        expect(result).toEqual({ granted: true });
        expect(mockCheck).toHaveBeenCalledWith('android.permission.CAMERA');
        expect(mockRequest).not.toHaveBeenCalled();
      });

      it('requests permission when not already granted and returns granted: true', async () => {
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockResolvedValue('granted');
        const result = await cameraPermission.ensureCameraPermission();
        expect(result).toEqual({ granted: true });
        expect(mockCheck).toHaveBeenCalledWith('android.permission.CAMERA');
        expect(mockRequest).toHaveBeenCalledWith('android.permission.CAMERA');
      });

      it('requests permission when not already granted and returns granted: false', async () => {
        mockCheck.mockResolvedValue('denied');
        mockRequest.mockResolvedValue('denied');
        const result = await cameraPermission.ensureCameraPermission();
        expect(result).toEqual({
          granted: false,
          error: new Error('Camera permission denied'),
        });
        expect(mockCheck).toHaveBeenCalledWith('android.permission.CAMERA');
        expect(mockRequest).toHaveBeenCalledWith('android.permission.CAMERA');
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
