/**
 * Error thrown when interacting with the registry contract fails.
 *
 * @param message - description of the registry contract failure.
 */
export class RegistryContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryContractError';
  }
}
