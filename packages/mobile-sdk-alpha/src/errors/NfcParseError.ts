import { SdkError } from './SdkError';

/**
 * Error thrown when NFC data cannot be parsed.
 *
 * @param message - description of the parsing failure.
 * @param options - optional underlying error details.
 */
export class NfcParseError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_NFC_PARSE', 'validation', false, options);
    this.name = 'NfcParseError';
  }
}
