// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { create } from 'zustand';

import type { DocumentCatalog, IDDocument, PassportData } from '@selfxyz/common';

import type { NFCScanContext, ProofContext } from '../proving/internal/logging';
import type { ProvingState } from '../proving/provingMachine';
import type { MRZState } from '../stores/mrzStore';
import type { ProtocolState } from '../stores/protocolStore';
import type { SelfAppState } from '../stores/selfAppStore';
import type { LogLevel, Progress } from './base';
import type { SDKEvent, SDKEventMap } from './events';

export type { PassportValidationCallbacks } from '../validation/document';
export type { DocumentCatalog, IDDocument, PassportData };
export interface Config {
  /**
   * Optional knobs to tweak SDK behaviour. All values are nullable so consumers
   * can rely on built-in defaults and only override the pieces they care about.
   */
  timeouts?: {
    /**
     * Maximum duration (in milliseconds) the SDK waits for an MRZ+NFC scan
     * before aborting. Defaults to an internal guard that balances user
     * patience with common chip read times. Provide a value only when the host
     * app can surface a matching progress indicator.
     */
    scanMs?: number;
  };
  /**
   * Feature flag gate used to gradually roll out experiments. Missing keys are
   * treated as `false` and the SDK will continue using legacy flows.
   */
  features?: Record<string, boolean>;
}

/**
 * Minimal crypto interface the SDK needs to derive secrets, sign payloads, and
 * hash data. Implementations must be deterministic across platforms and may be
 * invoked from background threads while NFC or proving work is in flight.
 */
export interface CryptoAdapter {
  /**
   * Hashes the provided input using the requested algorithm. `sha256` is the
   * only supported algorithm today and is used for nullifier derivation.
   * Implementations should throw when an unsupported algorithm is requested.
   */
  hash(input: Uint8Array, algo?: 'sha256'): Promise<Uint8Array>;
  /**
   * Signs the payload referenced by `keyRef`. The adapter is responsible for
   * resolving the backing key material and must reject the promise when the
   * user has not provisioned credentials (for example a missing secure enclave
   * key). The SDK retries failures only when the rejection exposes an
   * `AbortError`.
   */
  sign(data: Uint8Array, keyRef: string): Promise<Uint8Array>;
}

/**
 * Thin wrapper around the host networking stack so mobile, web, and Node
 * consumers can plug in their own fetch polyfills. Requests must respect the
 * provided {@link AbortSignal} and surface HTTP errors as rejected promises.
 */
export interface HttpAdapter {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}

/**
 * Normalised machine-readable zone details extracted from either MRZ OCR or an
 * NFC DG1 read. Callers should treat the fields as opaque strings and avoid
 * mutating them in place because downstream checksum validation depends on the
 * raw values.
 */
export interface MRZInfo {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  issuingCountry: string;
  documentType: string;
  /**
   * Optional validation metadata from {@link PassportValidationCallbacks}. iOS
   * adapters currently omit this field, so consumers must handle `undefined`.
   */
  validation?: MRZValidation;
}

/**
 * Common analytics payload describing why an action succeeded or failed.
 * Reserve string constants for `reason` so dashboards can aggregate over
 * stable values (for example `network_error`, `timeout`, `invalid_input`).
 *
 * **Security:** Do not include PII (names, DOB, passport numbers, addresses)
 * or secrets (API keys, tokens, passwords) in any field. Use non-identifying
 * categorical values or hashed identifiers where needed. Apply standard
 * redaction patterns (e.g., `***-***-1234` for document numbers).
 */
export interface TrackEventParams {
  reason?: string | null;
  duration_seconds?: number;
  attempt_count?: number;
  [key: string]: unknown;
}

/**
 * Optional hooks that route usage analytics to the host application. All
 * methods should fail silently so instrumentation never blocks critical user
 * flows.
 */
export interface AnalyticsAdapter {
  /**
   * Fire-and-forget event tracker for high-level milestones like onboarding
   * completion. Implementations should debounce repeated calls triggered by
   * retries.
   */
  trackEvent?(event: string, payload?: TrackEventParams): void;
  /**
   * Structured metrics specific to NFC scanning. Consumers can enrich the
   * payload to correlate with hardware models or OS versions.
   */
  trackNfcEvent?(name: string, properties?: Record<string, unknown>): void;
  /**
   * Low-level logging channel mirroring {@link SdkEvents.NFC_EVENT}. Use this
   * to pipe contextual errors into crash reporters or observability backends.
   *
   * **Security:** Never include PII or secrets in `message`, `context`, or
   * `details`. Apply standard redaction (e.g., passport `***-***-1234`,
   * names `J*** D***`) before logging.
   */
  logNFCEvent?(level: LogLevel, message: string, context: NFCScanContext, details?: Record<string, unknown>): void;
}

/**
 * Auth adapter responsible for providing private key material backing the
 * wallet. The SDK only reads keys; it never persists or mutates them.
 */
export interface AuthAdapter {
  /**
   * Returns the hex-encoded private key. Implementations should resolve to
   * `null` when a key has not been provisioned rather than throwing so the SDK
   * can prompt users to complete setup.
   */
  getPrivateKey(): Promise<string | null>;
}

/**
 * Clock utilities that enable deterministic testing and allow React Native
 * hosts to plug in platform timers that respect app lifecycle events.
 */
export interface ClockAdapter {
  /** Returns the current timestamp in milliseconds. */
  now(): number;
  /**
   * Suspends execution for the requested duration. Implementations must honour
   * the optional {@link AbortSignal} to allow NFC or proving workflows to
   * cancel outstanding sleeps when a user backs out.
   */
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

/**
 * Detailed MRZ checksum results surfaced alongside parsed data. Consumer apps
 * can use this information to render troubleshooting copy when OCR quality is
 * poor.
 */
export interface MRZValidation {
  format: boolean;
  passportNumberChecksum: boolean;
  dateOfBirthChecksum: boolean;
  dateOfExpiryChecksum: boolean;
  compositeChecksum: boolean;
  overall: boolean;
}

export type { LogLevel, Progress };

/**
 * Bundle of adapters required to construct {@link SelfClient}. Most fields are
 * mandatory because the SDK does not ship browser or native fallbacks.
 */
export interface Adapters {
  /** Optional persistent storage implementation; the SDK degrades gracefully when omitted. */
  storage?: StorageAdapter;
  /** Required NFC scanner integration. Must support aborting and surface hardware-specific errors. */
  scanner: NFCScannerAdapter;
  /** Required cryptography implementation backed by a secure enclave or web crypto. */
  crypto: CryptoAdapter;
  /** Required HTTP/WebSocket stack for talking to Self services. */
  network: NetworkAdapter;
  /** Optional clock utilities, useful when hosting inside React Native headless tasks. */
  clock?: ClockAdapter;
  /** Optional logger adapter. When omitted the SDK falls back to `console`. */
  logger?: LoggerAdapter;
  /** Optional analytics hook. */
  analytics?: AnalyticsAdapter;
  /** Required auth adapter providing private key access. */
  auth: AuthAdapter;
  /** Required document persistence layer. Implementations must be idempotent. */
  documents: DocumentsAdapter;
  /**  Required navigation adapter for handling screen transitions. */
  navigation: NavigationAdapter;
}

/**
 * Map these route names to your navigation configuration.
 * Includes all screens that the SDK may navigate to across host applications.
 */
export type RouteName =
  // Document acquisition flow
  | 'DocumentCamera'
  | 'DocumentOnboarding'
  | 'CountryPicker'
  | 'IDPicker'
  | 'DocumentNFCScan'
  | 'ManageDocuments'
  // Account/onboarding flow
  | 'Home'
  | 'AccountVerifiedSuccess'
  | 'AccountRecoveryChoice'
  | 'SaveRecoveryPhrase'
  // Error/fallback screens
  | 'ComingSoon'
  | 'DocumentDataNotFound'
  // Settings
  | 'Settings';

export interface NavigationAdapter {
  goBack(): void;
  goTo(routeName: RouteName, params?: Record<string, unknown>): void;
  enableKeychainErrorModal?(): void;
  disableKeychainErrorModal?(): void;
}

/**
 * Logging surface that mirrors structured logging conventions used by Self
 * infrastructure. Implementations must never log PII or secrets and should
 * enforce redaction before emitting. Avoid throwing to keep telemetry
 * best-effort.
 *
 * **Security:** Always redact sensitive fields (names, DOB, passport numbers,
 * credentials, tokens) using consistent patterns before logging. Examples:
 * `***-***-1234` for document numbers, `J*** D***` for names.
 */
export interface LoggerAdapter {
  log(level: LogLevel, message: string, fields?: Record<string, unknown>): void;
}

/**
 * Networking adapter that pairs REST and WebSocket clients. These are invoked
 * from both the proving machine and background sync flows.
 */
export interface NetworkAdapter {
  http: HttpAdapter;
  ws: WsAdapter;
}

/**
 * Parameters forwarded to the NFC adapter. The SDK guarantees the MRZ fields
 * have already passed checksum validation. Implementations must honour
 * `signal` for cancellation and may inspect optional CAN/PACE toggles to adjust
 * hardware configuration.
 */
export type NFCScanOpts = {
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
};

/** NFC scan result containing the parsed passport payload. */
export type NFCScanResult = {
  passportData: PassportData;
};

/**
 * Adapter that bridges into the platform-specific NFC reader. The promise must
 * reject with rich error objects (for example `NfcConnectionError`) so the SDK
 * can surface actionable guidance to end users.
 */
export interface NFCScannerAdapter {
  scan(opts: NFCScanOpts & { signal?: AbortSignal }): Promise<NFCScanResult>;
}

/**
 * Persistence layer responsible for storing encrypted documents and catalogs.
 * Implementations should treat all operations as transactional; the SDK will
 * not retry partial writes.
 */
export interface DocumentsAdapter {
  loadDocumentCatalog(): Promise<DocumentCatalog>;
  saveDocumentCatalog(catalog: DocumentCatalog): Promise<void>;

  loadDocumentById(id: string): Promise<IDDocument | null>;
  saveDocument(id: string, passportData: IDDocument): Promise<void>;

  /** Permanently deletes a stored document. The operation must be idempotent. */
  deleteDocument(id: string): Promise<void>;
}

/**
 * Primary entry point exposed to host applications. `SelfClient` composes
 * adapters, stores, and event emitters to coordinate the entire proving
 * lifecycle.
 */
export interface SelfClient {
  /** Starts an NFC scan using the configured adapter and resolves with passport data. */
  scanNFC(opts: NFCScanOpts & { signal?: AbortSignal }): Promise<NFCScanResult>;
  /** Parses MRZ text and returns structured fields plus checksum metadata. */
  extractMRZInfo(mrz: string): MRZInfo;
  goBack(): void;
  goTo(routeName: RouteName, params?: Record<string, unknown>): void;
  navigation: NavigationAdapter;

  /**
   * Convenience wrapper around {@link AnalyticsAdapter.trackEvent}. Calls are
   * no-ops when an analytics adapter was not provided.
   */
  trackEvent(event: string, payload?: TrackEventParams): void;
  /** Mirrors {@link AnalyticsAdapter.trackNfcEvent}. */
  trackNfcEvent(name: string, properties?: Record<string, unknown>): void;
  /** Mirrors {@link AnalyticsAdapter.logNFCEvent}. */
  logNFCEvent(level: LogLevel, message: string, context: NFCScanContext, details?: Record<string, unknown>): void;

  /** Returns the caller-provided private key or `null` when unconfigured. */
  getPrivateKey(): Promise<string | null>;
  /** Resolves to `true` when a private key is available without exposing it. */
  hasPrivateKey(): Promise<boolean>;
  /** Subscribes to {@link SdkEvents}. Returns an unsubscribe handle. */
  on<E extends SDKEvent>(event: E, cb: (payload?: SDKEventMap[E]) => void): Unsubscribe;
  /** Emits an event to registered listeners. Intended for internal SDK use. */
  emit<E extends SDKEvent>(event: E, payload?: SDKEventMap[E]): void;
  /**
   * Structured proving logger that enriches messages with {@link ProofContext}
   * so observability pipelines can stitch together multi-step workflows.
   */
  logProofEvent(level: LogLevel, message: string, context: ProofContext, details?: Record<string, any>): void;
  /** Reads the current document catalog. */
  loadDocumentCatalog(): Promise<DocumentCatalog>;
  /** Persists an updated document catalog. */
  saveDocumentCatalog(catalog: DocumentCatalog): Promise<void>;
  /** Loads a specific document, returning `null` when it does not exist. */
  loadDocumentById(id: string): Promise<IDDocument | null>;
  /** Saves or overwrites a document atomically. */
  saveDocument(id: string, passportData: IDDocument): Promise<void>;
  /** Deletes a stored document. */
  deleteDocument(id: string): Promise<void>;

  /** Snapshot accessor for the current proving machine state. */
  getProvingState: () => ProvingState;
  /** Snapshot accessor for UI state driving the Self app shell. */
  getSelfAppState: () => SelfAppState;
  /** Snapshot accessor for protocol metadata like trees and DNS mappings. */
  getProtocolState: () => ProtocolState;
  /** Snapshot accessor for MRZ-derived data fields. */
  getMRZState: () => MRZState;

  /**
   * Zustand store hook exposing live proving state updates. Hooks must be used
   * inside React components rendered after {@link createSelfClient} attaches
   * providers to avoid duplicate store instances.
   */
  useProvingStore: ReturnType<typeof create<ProvingState, []>>;
  /** Zustand store hook mirroring {@link SelfAppState}. */
  useSelfAppStore: ReturnType<typeof create<SelfAppState, []>>;
  /** Zustand store hook mirroring {@link ProtocolState}. */
  useProtocolStore: ReturnType<typeof create<ProtocolState, []>>;
  /** Zustand store hook mirroring {@link MRZState}. */
  useMRZStore: ReturnType<typeof create<MRZState, []>>;
}

/** Function returned by {@link SelfClient.on} to detach a listener. */
export type Unsubscribe = () => void;

/**
 * Storage shim used for lightweight persistence. Implementations should
 * support multi-tab or multi-session access when running on the web.
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * WebSocket connector invoked by the proving machine when establishing relay
 * sessions. Implementations must propagate {@link AbortSignal} cancellations
 * and reject with connection errors to trigger retries.
 */
export interface WsAdapter {
  connect(url: string, opts?: { signal?: AbortSignal; headers?: Record<string, string> }): WsConn;
}

/**
 * Active WebSocket connection handle returned by {@link WsAdapter}. All event
 * handler registrations should be idempotent and never throw.
 */
export interface WsConn {
  send: (data: string | ArrayBufferView | ArrayBuffer) => void;
  close: () => void;
  onMessage: (cb: (data: any) => void) => void;
  onError: (cb: (e: any) => void) => void;
  onClose: (cb: () => void) => void;
}
