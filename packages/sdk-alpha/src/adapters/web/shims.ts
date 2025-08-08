import type {
  ScannerAdapter,
  ScanOpts,
  ScanResult,
} from '../../types/public.js';

export const webScannerShim: ScannerAdapter = {
  async scan(opts: ScanOpts & { signal?: AbortSignal }): Promise<ScanResult> {
    switch (opts.mode) {
      case 'qr':
        return { mode: 'qr', data: 'self://stub-qr' };
      case 'mrz':
        throw Object.assign(new Error('MRZ scan not supported in web shim'), {
          code: 'SELF_ERR_SCANNER_UNAVAILABLE',
          category: 'scanner',
          retryable: false,
        });
      case 'nfc':
        throw Object.assign(new Error('NFC not supported in web shim'), {
          code: 'SELF_ERR_NFC_NOT_SUPPORTED',
          category: 'scanner',
          retryable: false,
        });
      default:
        throw Object.assign(new Error('Unknown scan mode'), {
          code: 'SELF_ERR_SCANNER_MODE',
          category: 'scanner',
          retryable: false,
        });
    }
  },
};
