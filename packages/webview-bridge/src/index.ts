// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export { WebViewBridge } from './bridge';
export type {
  BridgeDomain,
  BridgeMessageType,
  BridgeError,
  BridgeRequest,
  BridgeResponse,
  BridgeEvent,
  BridgeMessage,
  NfcScanParams,
  NfcScanProgress,
  BiometricAuthParams,
  VerificationResult,
  NativeTransport,
  WebViewBridgeOptions,
  EventHandler,
  NfcMethod,
  NfcEvent,
  BiometricsMethod,
  SecureStorageMethod,
  CameraMethod,
  CryptoMethod,
  HapticMethod,
  AnalyticsMethod,
  LifecycleMethod,
  DocumentsMethod,
  NavigationMethod,
} from './types';
export { BRIDGE_PROTOCOL_VERSION, DEFAULT_TIMEOUT_MS } from './types';
