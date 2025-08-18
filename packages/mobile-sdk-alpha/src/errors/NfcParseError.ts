import { SdkError } from './index';

export class NfcParseError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_NFC_PARSE', 'validation', false, options);
    this.name = 'NfcParseError';
  }
}
