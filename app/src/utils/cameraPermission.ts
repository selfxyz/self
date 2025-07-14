// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { Platform } from 'react-native';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';

export interface CameraPermissionResult {
  granted: boolean;
  error?: Error;
}

function getCameraPermissionConstant() {
  return Platform.select({
    ios: PERMISSIONS.IOS.CAMERA,
    android: PERMISSIONS.ANDROID.CAMERA,
  });
}

/**
 * Requests camera permission for the app (iOS & Android).
 * Uses react-native-permissions for unified handling.
 *
 * @returns Promise<CameraPermissionResult> - Object containing permission status and optional error
 */
export async function requestCameraPermission(): Promise<CameraPermissionResult> {
  try {
    const status = await check(getCameraPermissionConstant()!);
    if (status === RESULTS.GRANTED) {
      return { granted: true };
    }
    const requestStatus = await request(getCameraPermissionConstant()!);
    if (requestStatus === RESULTS.GRANTED) {
      return { granted: true };
    } else {
      return {
        granted: false,
        error: new Error('Camera permission denied'),
      };
    }
  } catch (err) {
    console.warn('Camera permission error:', err);
    return {
      granted: false,
      error: new Error('Camera permission request failed'),
    };
  }
}

/**
 * Checks if camera permission is already granted (iOS & Android).
 * Uses react-native-permissions for unified handling.
 *
 * @returns Promise<boolean> - True if permission is granted, false otherwise
 */
export async function checkCameraPermission(): Promise<boolean> {
  try {
    const status = await check(getCameraPermissionConstant()!);
    return status === RESULTS.GRANTED;
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
  // On iOS, camera permissions are handled automatically by AVFoundation
  // when the camera is first accessed. We shouldn't block camera access
  // based on permission checks since iOS will show the permission prompt
  // automatically when needed.
  if (Platform.OS === 'ios') {
    return { granted: true };
  }

  // On Android, we need explicit permission checking
  const hasPermission = await checkCameraPermission();
  if (hasPermission) {
    return { granted: true };
  }
  return await requestCameraPermission();
}
