export class VerifierContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VerifierContractError';
  }
}
