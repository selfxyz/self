// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type {
  AnalyticsMethod,
  BiometricAuthParams,
  BiometricsMethod,
  BridgeDomain,
  BridgeError,
  BridgeEvent,
  BridgeMessage,
  BridgeMessageType,
  BridgeRequest,
  BridgeResponse,
  BrowserHostOptions,
  CameraMethod,
  Capabilities,
  CryptoMethod,
  DocumentsMethod,
  EventHandler,
  HapticMethod,
  LifecycleConfigResponse,
  LifecycleMethod,
  NativeTransport,
  NavigationMethod,
  NfcEvent,
  NfcMethod,
  NfcScanParams,
  NfcScanProgress,
  SecureStorageMethod,
  SelfHostMessage,
  SelfHostMessageType,
  VerificationDismissPayload,
  VerificationDismissReason,
  VerificationResult,
  WebViewBridgeOptions,
} from './types';
export { BRIDGE_PROTOCOL_MINOR_VERSION, BRIDGE_PROTOCOL_VERSION, DEFAULT_TIMEOUT_MS } from './types';
export { WebViewBridge } from './bridge';
