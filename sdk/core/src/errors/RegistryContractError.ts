export class RegistryContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryContractError';
  }
}
