/**
 * Error thrown when proof generation or verification fails.
 *
 * @param message - description of the proof failure.
 */
export class ProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProofError';
  }
}
