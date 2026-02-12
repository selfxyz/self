/**
 * Bridge protocol types defining the contract between WebView and native shell.
 *
 * All messages are serialized as JSON and sent via postMessage/evaluateJavascript.
 * The protocol is versioned to allow for future evolution while maintaining
 * backward compatibility.
 */

/** Current protocol version. Bump major on breaking changes. */
export const BRIDGE_PROTOCOL_VERSION = 1;

/** Maximum time (ms) to wait for a native response before timing out. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Bridge domain identifiers. Each domain represents a native capability
 * that the WebView can invoke through the bridge.
 */
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

/**
 * Message direction discriminator.
 * - `request`: WebView → Native (JS initiates)
 * - `response`: Native → WebView (native replies to a request)
 * - `event`: Native → WebView (native pushes unsolicited data)
 */
export type BridgeMessageType = 'request' | 'response' | 'event';

/** Structured error returned from native when a bridge call fails. */
export interface BridgeError {
  /** Machine-readable error code (e.g. 'NFC_NOT_SUPPORTED', 'TIMEOUT'). */
  code: string;
  /** Human-readable description for logging. Never show to end users as-is. */
  message: string;
  /** Optional additional data for debugging. */
  details?: Record<string, unknown>;
}

/** Base fields shared by all bridge messages. */
interface BridgeMessageBase {
  /** Protocol version for compatibility checking. */
  version: number;
  /** Unique correlation ID (UUIDv4) linking requests to responses. */
  id: string;
  /** Domain this message belongs to. */
  domain: BridgeDomain;
  /** Timestamp (ms since epoch) when the message was created. */
  timestamp: number;
}

/** WebView → Native request. */
export interface BridgeRequest extends BridgeMessageBase {
  type: 'request';
  /** Method name within the domain (e.g. 'scan' for nfc domain). */
  method: string;
  /** Payload for the method. Must be JSON-serializable. */
  params: Record<string, unknown>;
}

/** Native → WebView response to a specific request. */
export interface BridgeResponse extends BridgeMessageBase {
  type: 'response';
  /** Correlation ID of the original request. */
  requestId: string;
  /** Whether the call succeeded. */
  success: boolean;
  /** Result data when success=true. */
  data?: unknown;
  /** Error info when success=false. */
  error?: BridgeError;
}

/** Native → WebView unsolicited event (e.g. NFC progress updates). */
export interface BridgeEvent extends BridgeMessageBase {
  type: 'event';
  /** Event name within the domain (e.g. 'scanProgress' for nfc domain). */
  event: string;
  /** Event payload. Must be JSON-serializable. */
  data: unknown;
}

/** Union of all bridge message types. */
export type BridgeMessage = BridgeRequest | BridgeResponse | BridgeEvent;

// ── Domain-specific method/event catalogs ──

/** NFC domain methods. */
export type NfcMethod = 'scan' | 'cancelScan' | 'isSupported';

/** NFC domain events. */
export type NfcEvent = 'scanProgress' | 'tagDiscovered' | 'scanError';

/** NFC scan parameters sent from WebView to native. */
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

/** NFC scan progress event data. */
export interface NfcScanProgress {
  step: string;
  percent: number;
  message?: string;
}

/** Biometrics domain methods. */
export type BiometricsMethod = 'authenticate' | 'isAvailable' | 'getBiometryType';

/** Biometric authentication parameters. */
export interface BiometricAuthParams {
  reason: string;
  fallbackLabel?: string;
}

/** Secure storage domain methods. */
export type SecureStorageMethod = 'get' | 'set' | 'remove';

/** Camera domain methods. */
export type CameraMethod = 'scanMRZ' | 'isAvailable';

/** Crypto domain methods (only sign goes through bridge; hash stays in WebView). */
export type CryptoMethod = 'sign' | 'generateKey' | 'getPublicKey';

/** Haptic domain methods. */
export type HapticMethod = 'trigger';

/** Analytics domain methods. */
export type AnalyticsMethod = 'trackEvent' | 'trackNfcEvent' | 'logNfcEvent';

/** Lifecycle domain methods. */
export type LifecycleMethod = 'ready' | 'dismiss' | 'setResult';

/** Documents domain methods. */
export type DocumentsMethod =
  | 'loadCatalog'
  | 'saveCatalog'
  | 'loadById'
  | 'save'
  | 'delete';

/** Navigation domain methods. */
export type NavigationMethod = 'goBack' | 'goTo';

/** Verification result sent back to host app via lifecycle.setResult. */
export interface VerificationResult {
  success: boolean;
  userId?: string;
  verificationId?: string;
  proof?: unknown;
  claims?: Record<string, unknown>;
  error?: BridgeError;
}

/** Type helper for creating typed bridge requests. */
export type TypedBridgeRequest<
  D extends BridgeDomain,
  M extends string,
  P extends Record<string, unknown>,
> = Omit<BridgeRequest, 'domain' | 'method' | 'params'> & {
  domain: D;
  method: M;
  params: P;
};

/** Type helper for typed event listeners. */
export type BridgeEventHandler<T = unknown> = (data: T) => void;

/** Configuration for the WebViewBridge. */
export interface BridgeConfig {
  /** Default timeout for requests in milliseconds. */
  defaultTimeout?: number;
  /** Protocol version to use. Defaults to BRIDGE_PROTOCOL_VERSION. */
  protocolVersion?: number;
  /** Enable debug logging. */
  debug?: boolean;
}
