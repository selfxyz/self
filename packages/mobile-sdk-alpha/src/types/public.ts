import type { SdkError } from '../errors';

export type { PassportData } from '@selfxyz/common/utils/types';
export type { PassportValidationCallbacks } from '../validation/document';

// Platform-neutral HTTP shapes
export type RequestLike = string | URL;
export interface RequestInitLike {
  method?: string;
  headers?: Record<string, string>;
  body?: string | ArrayBuffer | ArrayBufferView | Uint8Array;
}
export interface HttpResponseLike {
  status: number;
  headers: Record<string, string>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/**
 * Runtime configuration options for the SDK.
 */
export interface Config {
  endpoints?: { api?: string; teeWs?: string; artifactsCdn?: string };
  timeouts?: {
    httpMs?: number;
    wsMs?: number;
    scanMs?: number;
    proofMs?: number;
  };
  features?: Record<string, boolean>;
  tlsPinning?: { enabled: boolean; pins?: string[] };
}
/**
 * Provides cryptographic primitives used by the SDK.
 */
export interface CryptoAdapter {
  hash(input: Uint8Array, algo?: 'sha256'): Promise<Uint8Array>;
  sign(data: Uint8Array, keyRef: string): Promise<Uint8Array>;
}
/**
 * Minimal wrapper around `fetch` used for HTTP requests.
 */
export interface HttpAdapter {
  fetch(input: RequestLike, init?: RequestInitLike): Promise<HttpResponseLike>;
}
/**
 * Parsed machine-readable zone (MRZ) details from a passport.
 */
export interface MRZInfo {
  passportNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  surname: string;
  givenNames: string;
  sex: string;
  nationality: string;
  issuingCountry: string;
  documentType: string;
  validation: MRZValidation;
}
/**
 * Abstraction over timing operations used for timeouts and delays.
 */
export interface ClockAdapter {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}
/**
 * Result of validating fields within the MRZ.
 */
export interface MRZValidation {
  format: boolean;
  passportNumberChecksum: boolean;
  dateOfBirthChecksum: boolean;
  dateOfExpiryChecksum: boolean;
  compositeChecksum: boolean;
  overall: boolean;
}
/**
 * Supported log levels for {@link LoggerAdapter}.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Progress update emitted during long-running operations.
 */
export interface Progress {
  step: string;
  percent?: number;
}
/**
 * Collection of platform-specific adapters required by the SDK.
 */
export interface Adapters {
  storage: StorageAdapter;
  scanner: ScannerAdapter;
  crypto: CryptoAdapter;
  network: NetworkAdapter;
  clock: ClockAdapter;
  logger: LoggerAdapter;
}
/**
 * Represents a proof generation task that can be monitored or cancelled.
 */
export interface ProofHandle {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  result: () => Promise<{ ok: boolean; reason?: string }>;
  cancel: () => void;
}
/**
 * Logging interface consumed by the SDK for diagnostics.
 */
export interface LoggerAdapter {
  log(level: LogLevel, message: string, fields?: Record<string, unknown>): void;
}
/**
 * Parameters for requesting a cryptographic proof.
 */
export interface ProofRequest {
  type: 'register' | 'dsc' | 'disclose';
  payload: unknown;
}
/**
 * Networking capabilities including HTTP and WebSocket transports.
 */
export interface NetworkAdapter {
  http: HttpAdapter;
  ws: WsAdapter;
}
/**
 * Input used when querying registration status for a document.
 */
export interface RegistrationInput {
  docId?: string;
  scan: ScanResult;
}
/**
 * Response indicating whether a document is registered.
 */
export interface RegistrationStatus {
  registered: boolean;
  reason?: string;
}
/**
 * Mapping of SDK event names to their payload types.
 */
export interface SDKEventMap {
  progress: Progress;
  state: string;
  error: SdkError;
}
/**
 * Names of events emitted by {@link SelfClient}.
 */
export type SDKEvent = keyof SDKEventMap;

/**
 * Supported scanning modes.
 */
export type ScanMode = 'mrz' | 'nfc' | 'qr';
/**
 * Options passed to the scanning adapter.
 */
export interface ScanOpts {
  mode: ScanMode;
}
/**
 * Result returned from a scan operation.
 */
export type ScanResult =
  | {
      mode: 'mrz';
      passportNumber: string;
      dateOfBirth: string;
      dateOfExpiry: string;
      issuingCountry?: string;
      // Extended MRZ data when available
      mrzInfo?: MRZInfo;
    }
  | { mode: 'nfc'; raw: unknown }
  | { mode: 'qr'; data: string };
/**
 * Adapter interface for document scanning implementations.
 */
export interface ScannerAdapter {
  scan(opts: ScanOpts & { signal?: AbortSignal }): Promise<ScanResult>;
}
/**
 * Public client interface exposed to SDK consumers.
 */
export interface SelfClient {
  scanDocument(opts: ScanOpts & { signal?: AbortSignal }): Promise<ScanResult>;
  validateDocument(input: ValidationInput): Promise<ValidationResult>;
  checkRegistration(input: RegistrationInput): Promise<RegistrationStatus>;
  generateProof(
    req: ProofRequest,
    opts?: {
      signal?: AbortSignal;
      onProgress?: (p: Progress) => void;
      timeoutMs?: number;
    },
  ): Promise<ProofHandle>;
  on<E extends SDKEvent>(event: E, cb: (payload: SDKEventMap[E]) => void): Unsubscribe;
  emit<E extends SDKEvent>(event: E, payload: SDKEventMap[E]): void;
}
/**
 * Function returned to remove an event listener.
 */
export type Unsubscribe = () => void;
/**
 * Simple async key-value storage used by the SDK.
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
/**
 * Input for document validation operations.
 */
export interface ValidationInput {
  scan: ScanResult;
}
/**
 * Result of document validation.
 */
export interface ValidationResult {
  ok: boolean;
  reason?: string;
}
/**
 * WebSocket adapter used for real-time communication.
 */
export interface WsAdapter {
  connect(url: string, opts?: { signal?: AbortSignal; headers?: Record<string, string> }): WsConn;
}
/**
 * Handle representing an active WebSocket connection.
 */
export interface WsConn {
  send: (data: string | ArrayBufferView | ArrayBuffer) => void;
  close: () => void;
  onMessage: (cb: (data: any) => void) => void;
  onError: (cb: (e: any) => void) => void;
  onClose: (cb: () => void) => void;
}
