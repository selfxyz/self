// Browser-safe exports with explicit tree-shaking friendly imports
export { createSelfClient } from './client.js';
export { defaultConfig } from './config/defaults.js';
export { extractMRZInfo, formatDateToYYMMDD } from './processing/mrz.js';
export { webScannerShim } from './adapters/web/shims.js';

// Export browser-safe types and errors
export * from './types/public.js';
export * from './errors.js';

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
} from './types/public.js';
