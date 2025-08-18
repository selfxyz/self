import { SdkError } from './index';

export class LivenessError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_LIVENESS', 'liveness', false, options);
    this.name = 'LivenessError';
  }
}
