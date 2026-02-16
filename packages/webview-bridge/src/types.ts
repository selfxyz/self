// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

export const BRIDGE_PROTOCOL_VERSION = 1;
export const DEFAULT_TIMEOUT_MS = 30_000;

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

export type BridgeMessageType = 'request' | 'response' | 'event';

export interface BridgeError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

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

// Domain-specific method types
export type NfcMethod = 'scan' | 'cancelScan' | 'isSupported';
export type NfcEvent = 'scanProgress' | 'tagDiscovered' | 'scanError';
export type BiometricsMethod = 'authenticate' | 'isAvailable' | 'getBiometryType';
export type SecureStorageMethod = 'get' | 'set' | 'remove';
export type CameraMethod = 'scanMRZ' | 'isAvailable';
export type CryptoMethod = 'sign' | 'generateKey' | 'getPublicKey';
export type HapticMethod = 'trigger';
export type AnalyticsMethod = 'trackEvent' | 'trackNfcEvent' | 'logNfcEvent';
export type LifecycleMethod = 'ready' | 'dismiss' | 'setResult';
export type DocumentsMethod = 'loadCatalog' | 'saveCatalog' | 'loadById' | 'save' | 'delete';
export type NavigationMethod = 'goBack' | 'goTo';

// NFC-specific param/result types
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

export interface BiometricAuthParams {
  reason: string;
  fallbackLabel?: string;
}

export interface VerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  claims?: Record<string, unknown>;
  error?: BridgeError;
}

// Transport interface
export interface NativeTransport {
  postMessage(json: string): void;
}

export interface WebViewBridgeOptions {
  debug?: boolean;
  transport?: NativeTransport;
}

// Pending request tracker
export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// Event listener
export type EventHandler = (data: unknown) => void;
