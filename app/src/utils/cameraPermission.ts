// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import { Alert, Linking, Platform } from 'react-native';
import {
  check,
  openSettings,
  PERMISSIONS,
  request,
  RESULTS,
} from 'react-native-permissions';

const CAMERA_PERMISSION =
  Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;

async function safeCheck(): Promise<string> {
  try {
    return await check(CAMERA_PERMISSION);
  } catch {
    return RESULTS.UNAVAILABLE;
  }
}

async function safeRequest(): Promise<string> {
  try {
    return await request(CAMERA_PERMISSION);
  } catch {
    return RESULTS.UNAVAILABLE;
  }
}

function openAppSettings(): void {
  openSettings().catch(() => {
    Linking.openSettings().catch(() => {});
  });
}

function showBlockedAlert(onFallback?: () => void): void {
  const buttons: Array<{
    text: string;
    style?: 'cancel';
    onPress?: () => void;
  }> = [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: openAppSettings },
  ];
  if (onFallback) {
    buttons.splice(1, 0, {
      text: 'Try Alternative Verification',
      onPress: onFallback,
    });
  }
  Alert.alert(
    'Camera access needed',
    'Self needs camera access to scan your passport. Enable it in Settings to continue.',
    buttons,
  );
}

function showUnavailableAlert(onFallback?: () => void): void {
  Alert.alert(
    'Camera not available',
    onFallback
      ? "This device doesn't have a camera available. You can still verify your ID with an alternative method."
      : "This device doesn't have a camera available. A camera is required to scan your ID.",
    onFallback
      ? [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Alternative Verification', onPress: onFallback },
        ]
      : [{ text: 'OK' }],
  );
}

/**
 * Checks camera permission before launching a flow that mounts the camera
 * (e.g. passport OCR scanning). Prompts the user when the permission is
 * re-askable. Shows an alert with a Settings deep-link on blocked/unavailable
 * states. Returns true only when the flow should proceed.
 */
export async function ensureCameraForPassportScan(opts?: {
  onFallback?: () => void;
}): Promise<boolean> {
  let status = await safeCheck();
  if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
    return true;
  }
  if (status === RESULTS.DENIED) {
    status = await safeRequest();
    if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
      return true;
    }
  }
  if (status === RESULTS.UNAVAILABLE) {
    showUnavailableAlert(opts?.onFallback);
  } else {
    showBlockedAlert(opts?.onFallback);
  }
  return false;
}
