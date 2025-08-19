import { SdkError } from './SdkError';

/**
 * Error thrown when an MRZ string fails validation or parsing.
 *
 * @param message - description of the MRZ parsing failure.
 * @param options - optional underlying error details.
 */
export class MrzParseError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_MRZ_PARSE', 'validation', false, options);
    this.name = 'MrzParseError';
  }
}
