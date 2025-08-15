export type { PassportData } from '@selfxyz/common/utils/types';
export type { PassportValidationCallbacks } from '../validation/document';
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
export interface CryptoAdapter {
  hash(input: Uint8Array, algo?: 'sha256'): Promise<Uint8Array>;
  sign(data: Uint8Array, keyRef: string): Promise<Uint8Array>;
}

export interface HttpAdapter {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
}
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

export interface ClockAdapter {
  now(): number;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export interface MRZValidation {
  format: boolean;
  passportNumberChecksum: boolean;
  dateOfBirthChecksum: boolean;
  dateOfExpiryChecksum: boolean;
  compositeChecksum: boolean;
  overall: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Progress {
  step: string;
  percent?: number;
}
export interface Adapters {
  storage: StorageAdapter;
  scanner: ScannerAdapter;
  crypto: CryptoAdapter;
  network: NetworkAdapter;
  clock: ClockAdapter;
  logger: LoggerAdapter;
}

export interface ProofHandle {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  result: () => Promise<{ ok: boolean; reason?: string }>;
  cancel: () => void;
}
export interface LoggerAdapter {
  log(level: LogLevel, message: string, fields?: Record<string, unknown>): void;
}

export interface ProofRequest {
  type: 'register' | 'dsc' | 'disclose';
  payload: unknown;
}
export interface NetworkAdapter {
  http: HttpAdapter;
  ws: WsAdapter;
}

export interface RegistrationInput {
  docId?: string;
  scan: ScanResult;
}

export interface RegistrationStatus {
  registered: boolean;
  reason?: string;
}

export interface SDKEventMap {
  progress: Progress;
  state: string;
  error: Error;
}
export type SDKEvent = keyof SDKEventMap;

export type ScanMode = 'mrz' | 'nfc' | 'qr';
export interface ScanOpts {
  mode: ScanMode;
}
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
export interface ScannerAdapter {
  scan(opts: ScanOpts & { signal?: AbortSignal }): Promise<ScanResult>;
}
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
export type Unsubscribe = () => void;
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
export interface ValidationInput {
  scan: ScanResult;
}
export interface ValidationResult {
  ok: boolean;
  reason?: string;
}
export interface WsAdapter {
  connect(url: string, opts?: { signal?: AbortSignal; headers?: Record<string, string> }): WsConn;
}

export interface WsConn {
  send: (data: string | ArrayBufferView | ArrayBuffer) => void;
  close: () => void;
  onMessage: (cb: (data: any) => void) => void;
  onError: (cb: (e: any) => void) => void;
  onClose: (cb: () => void) => void;
}
