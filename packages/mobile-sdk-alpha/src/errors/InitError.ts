import { SdkError } from './SdkError';

/**
 * Error thrown when the SDK fails to initialize correctly.
 *
 * @param message - description of the initialization failure.
 * @param options - optional underlying error details.
 */
export class InitError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_INIT', 'init', false, options);
    this.name = 'InitError';
  }
}
