// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

export type AnalyticsMethod = 'trackEvent' | 'trackNfcEvent' | 'logNfcEvent';

export interface BiometricAuthParams {
  reason: string;
  fallbackLabel?: string;
}

export type BiometricsMethod = 'authenticate' | 'isAvailable' | 'getBiometryType';

export type BridgeDomain =
  | 'nfc'
  | 'biometrics'
  | 'secureStorage'
  | 'camera'
  | 'crypto'
  | 'haptic'
  | 'analytics'
  | 'lifecycle'
  | 'documents'
  | 'navigation';

export interface BridgeError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface BridgeEvent {
  type: 'event';
  version: number;
  id: string;
  domain: BridgeDomain;
  event: string;
  data: unknown;
  timestamp: number;
}

export type BridgeMessage = BridgeRequest | BridgeResponse | BridgeEvent;

export type BridgeMessageType = 'request' | 'response' | 'event';

export interface BridgeRequest {
  type: 'request';
  version: number;
  id: string;
  domain: BridgeDomain;
  method: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface BridgeResponse {
  type: 'response';
  version: number;
  id: string;
  domain: BridgeDomain;
  requestId: string;
  success: boolean;
  data?: unknown;
  error?: BridgeError;
  timestamp: number;
}

export interface BrowserHostOptions {
  targetOrigin?: string;
}

export type CameraMethod = 'scanMRZ' | 'isAvailable';

export type CryptoMethod = 'sign' | 'generateKey' | 'getPublicKey';

export type DocumentsMethod = 'loadCatalog' | 'saveCatalog' | 'loadById' | 'save' | 'delete';

export type EventHandler = (data: unknown) => void;

export type HapticMethod = 'trigger';

export type LifecycleMethod = 'ready' | 'dismiss' | 'setResult';

export interface NativeTransport {
  postMessage(json: string): void;
  kind?: 'native' | 'browser-host';
}

export type NavigationMethod = 'goBack' | 'goTo';

export type NfcEvent = 'scanProgress' | 'tagDiscovered' | 'scanError';

export type NfcMethod = 'scan' | 'cancelScan' | 'isSupported';

export interface NfcScanParams {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  canNumber?: string;
  skipPACE?: boolean;
  skipCA?: boolean;
  extendedMode?: boolean;
  usePacePolling?: boolean;
  sessionId: string;
  useCan?: boolean;
  userId?: string;
}

export interface NfcScanProgress {
  step: string;
  percent: number;
  message?: string;
}

export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export type SecureStorageMethod = 'get' | 'set' | 'remove';

export interface SelfHostMessage<TPayload extends object = Record<string, unknown>> {
  type: SelfHostMessageType;
  version: 1;
  payload: TPayload;
}

export type SelfHostMessageType = 'self:ready' | 'self:result' | 'self:dismiss' | 'self:cancel';

export interface VerificationDismissPayload {
  reason?: VerificationDismissReason;
}

export type VerificationDismissReason = 'user_cancel' | 'back' | 'timeout';

export interface VerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  claims?: Record<string, unknown>;
  error?: BridgeError;
}

export interface WebViewBridgeOptions {
  debug?: boolean;
  transport?: NativeTransport;
  browserHost?: BrowserHostOptions;
}

export const BRIDGE_PROTOCOL_VERSION = 1;

export const DEFAULT_TIMEOUT_MS = 30_000;
