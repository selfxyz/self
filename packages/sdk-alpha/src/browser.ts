// Browser-safe exports with explicit tree-shaking friendly imports
export { createSelfClient } from './client';
export { defaultConfig } from './config/defaults';
export { extractMRZInfo, formatDateToYYMMDD } from './processing/mrz';
export { webScannerShim } from './adapters/web/shims';

// Export browser-safe types and errors
export * from './types/public';
export * from './errors';

// Export browser-compatible adapters (excludes any Node-specific adapters)
export type {
  ScannerAdapter,
  CryptoAdapter,
  NetworkAdapter,
  StorageAdapter,
  ClockAdapter,
  LoggerAdapter,
  HttpAdapter,
  WsAdapter,
  WsConn,
} from './types/public';
