/**
 * Error thrown when calls to the verifier contract fail.
 *
 * @param message - description of the verifier contract failure.
 */
export class VerifierContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerifierContractError';
  }
}
