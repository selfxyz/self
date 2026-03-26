// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';
import type { BiometricAuthParams } from '../types';

export interface BridgeBiometricsAdapter {
  authenticate(params: BiometricAuthParams): Promise<boolean>;
  isAvailable(): Promise<boolean>;
  getBiometryType(): Promise<string>;
}

export function bridgeBiometricsAdapter(bridge: WebViewBridge): BridgeBiometricsAdapter {
  return {
    async authenticate(params: BiometricAuthParams): Promise<boolean> {
      // Native handler returns JsonPrimitive(true) on success,
      // throws BridgeHandlerException on failure.
      return bridge.request<boolean>('biometrics', 'authenticate', params as unknown as Record<string, unknown>);
    },

    async isAvailable(): Promise<boolean> {
      // Native handler returns JsonPrimitive(true/false).
      return bridge.request<boolean>('biometrics', 'isAvailable', {});
    },

    async getBiometryType(): Promise<string> {
      // Native handler returns JsonPrimitive("FaceID"/"TouchID"/"none").
      return bridge.request<string>('biometrics', 'getBiometryType', {});
    },
  };
}
