import { SdkError } from './index';

export class InitError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_INIT', 'init', false, options);
    this.name = 'InitError';
  }
}
