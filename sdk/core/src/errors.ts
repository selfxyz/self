export enum ConfigMismatch {
  InvalidId = 'InvalidId',
  InvalidUserContextHash = 'InvalidUserContextHash',
  InvalidScope = 'InvalidScope',
  InvalidRoot = 'InvalidRoot',
  InvalidAttestationId = 'InvalidAttestationId',
  InvalidForbiddenCountriesList = 'InvalidForbiddenCountriesList',
  InvalidMinimumAge = 'InvalidMinimumAge',
  InvalidTimestamp = 'InvalidTimestamp',
  InvalidOfac = 'InvalidOfac'
}

export class ConfigMismatchError extends Error {
  public readonly issues: Array<{ type: ConfigMismatch; message: string }>;

  constructor(issues: Array<{ type: ConfigMismatch; message: string }>) {
    const message = issues.map(issue => `[${issue.type}]: ${issue.message}`).join('\n');
    super(message);
    this.name = 'ConfigMismatchError';
    this.issues = issues;

    Object.setPrototypeOf(this, ConfigMismatchError.prototype);
  }

  static single(type: ConfigMismatch, message: string): ConfigMismatchError {
    return new ConfigMismatchError([{ type, message }]);
  }
}

export enum InvalidProof {
  InvalidProof = 'InvalidProof',
}

export class InvalidProofError extends Error {
  public readonly type: InvalidProof;

  constructor(type: InvalidProof, message: string) {
    super(`[${type}]: ${message}`);
    this.name = 'InvalidProofError';
    this.type = type;

    Object.setPrototypeOf(this, InvalidProofError.prototype);
  }
}
