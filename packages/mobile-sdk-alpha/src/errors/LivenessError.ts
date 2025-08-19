import { SdkError } from './SdkError';

/**
 * Error thrown when liveness checks detect an issue.
 *
 * @param message - description of the liveness failure.
 * @param options - optional underlying error details.
 */
export class LivenessError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_LIVENESS', 'liveness', false, options);
    this.name = 'LivenessError';
  }
}
