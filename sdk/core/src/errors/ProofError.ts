export class ProofError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProofError';
  }
}
