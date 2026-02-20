// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { WebViewBridge } from '../bridge';

export interface MrzScanResult {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}

export interface BridgeCameraAdapter {
  scanMRZ(): Promise<MrzScanResult>;
  isAvailable(): Promise<boolean>;
}

export function bridgeCameraAdapter(
  bridge: WebViewBridge,
): BridgeCameraAdapter {
  return {
    async scanMRZ(): Promise<MrzScanResult> {
      // Native handler parses the MRZ JSON string into a JsonElement,
      // which arrives as an object with documentNumber, dateOfBirth, dateOfExpiry.
      return bridge.request<MrzScanResult>('camera', 'scanMRZ', {});
    },

    async isAvailable(): Promise<boolean> {
      // Native handler returns JsonPrimitive(true/false).
      return bridge.request<boolean>('camera', 'isAvailable', {});
    },
  };
}
