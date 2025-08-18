import { SdkError } from './index';

export class MrzParseError extends SdkError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, 'SELF_ERR_MRZ_PARSE', 'validation', false, options);
    this.name = 'MrzParseError';
  }
}
