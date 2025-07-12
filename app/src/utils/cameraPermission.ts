// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { PermissionsAndroid, Platform } from 'react-native';

export interface CameraPermissionResult {
  granted: boolean;
  error?: Error;
}

/**
 * Requests camera permission for the app.
 * On iOS, camera permissions are handled automatically by the native component.
 * On Android, explicitly requests the CAMERA permission.
 *
 * @returns Promise<CameraPermissionResult> - Object containing permission status and optional error
 */
export async function requestCameraPermission(): Promise<CameraPermissionResult> {
  // iOS handles camera permissions automatically through the native component
  if (Platform.OS !== 'android') {
    return { granted: true };
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message:
          'This app needs access to your camera to scan passport documents.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    const permissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;

    if (!permissionGranted) {
      return {
        granted: false,
        error: new Error('Camera permission denied'),
      };
    }

    return { granted: true };
  } catch (err) {
    console.warn('Camera permission error:', err);
    return {
      granted: false,
      error: new Error('Camera permission request failed'),
    };
  }
}

/**
 * Checks if camera permission is already granted.
 * On iOS, returns true as permissions are handled automatically.
 * On Android, checks the current permission status.
 *
 * @returns Promise<boolean> - True if permission is granted, false otherwise
 */
export async function checkCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
  } catch (err) {
    console.warn('Camera permission check error:', err);
    return false;
  }
}

/**
 * Ensures camera permission is granted, requesting it if necessary.
 * This is a convenience function that combines check and request logic.
 *
 * @returns Promise<CameraPermissionResult> - Object containing permission status and optional error
 */
export async function ensureCameraPermission(): Promise<CameraPermissionResult> {
  const hasPermission = await checkCameraPermission();

  if (hasPermission) {
    return { granted: true };
  }

  return await requestCameraPermission();
}
