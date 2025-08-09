export { createSelfClient } from './client';
export * from './types/public';
export * from './adapters/index';
export * from './errors';
export { defaultConfig } from './config/defaults';
export { webScannerShim } from './adapters/web/shims';

// expose initial processing helper to prove structure works
export { extractMRZInfo, formatDateToYYMMDD } from './processing/mrz';
