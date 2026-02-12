// Core bridge
export { WebViewBridge } from './bridge';
export type { NativeTransport } from './bridge';

// Types
export type {
  BridgeConfig,
  BridgeDomain,
  BridgeError,
  BridgeEvent,
  BridgeEventHandler,
  BridgeMessage,
  BridgeMessageType,
  BridgeRequest,
  BridgeResponse,
  TypedBridgeRequest,
  // Domain-specific types
  NfcMethod,
  NfcEvent,
  NfcScanParams,
  NfcScanProgress,
  BiometricsMethod,
  BiometricAuthParams,
  SecureStorageMethod,
  CameraMethod,
  CryptoMethod,
  HapticMethod,
  AnalyticsMethod,
  LifecycleMethod,
  DocumentsMethod,
  NavigationMethod,
  VerificationResult,
} from './types';

// Constants
export { BRIDGE_PROTOCOL_VERSION, DEFAULT_TIMEOUT_MS } from './types';
