export { createSelfClient } from './client.js';
export * from './types/public.js';
export * from './adapters/index.js';
export * from './errors.js';
export { defaultConfig } from './config/defaults.js';
export { webScannerShim } from './adapters/web/shims.js';

// expose initial processing helper to prove structure works
export { extractMRZInfo, formatDateToYYMMDD } from './processing/mrz.js';
