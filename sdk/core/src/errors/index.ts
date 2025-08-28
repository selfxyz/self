export enum ConfigMismatch {
  InvalidId = 'InvalidId',
  InvalidUserContextHash = 'InvalidUserContextHash',
  InvalidScope = 'InvalidScope',
  InvalidRoot = 'InvalidRoot',
  InvalidAttestationId = 'InvalidAttestationId',
  InvalidForbiddenCountriesList = 'InvalidForbiddenCountriesList',
  InvalidMinimumAge = 'InvalidMinimumAge',
  InvalidTimestamp = 'InvalidTimestamp',
  InvalidOfac = 'InvalidOfac',
  ConfigNotFound = 'ConfigNotFound',
}

export class ConfigMismatchError extends Error {
  public readonly issues: Array<{ type: ConfigMismatch; message: string }>;

  constructor(issues: Array<{ type: ConfigMismatch; message: string }>) {
    const message = issues.map((issue) => `[${issue.type}]: ${issue.message}`).join('\n');
    super(message);
    this.name = 'ConfigMismatchError';
    this.issues = issues;

    Object.setPrototypeOf(this, ConfigMismatchError.prototype);
  }

  static single(type: ConfigMismatch, message: string): ConfigMismatchError {
    return new ConfigMismatchError([{ type, message }]);
  }
}

export { RegistryContractError } from './RegistryContractError.js';
export { VerifierContractError } from './VerifierContractError.js';
export { ProofError } from './ProofError.js';
