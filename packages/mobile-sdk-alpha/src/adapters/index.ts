/**
 * Re-exports of adapter interfaces used by the SDK.
 * Consumers implement these to integrate with platform-specific
 * capabilities such as networking, storage, or scanning hardware.
 */
export type {
  Adapters,
  ClockAdapter,
  CryptoAdapter,
  HttpAdapter,
  LoggerAdapter,
  NetworkAdapter,
  ScannerAdapter,
  StorageAdapter,
  WsAdapter,
} from '../types/public';
