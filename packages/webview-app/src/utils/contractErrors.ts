// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Static map of Solidity custom error selectors to human-readable messages.
 *
 * Generated from contracts/scripts/findErrorSelectors.ts — update this map
 * whenever new custom errors are added to the contracts.
 *
 * Selector = first 4 bytes of keccak256(error signature).
 */
const ERROR_SELECTOR_MAP: Record<string, { name: string; message: string }> = {
  // IdentityVerificationHubImplV2
  '0x0ee78d58': { name: 'NoVerifierSet', message: 'No verifier has been configured for this attestation type.' },
  '0x12ec75fe': { name: 'InvalidAttestationId', message: 'The attestation ID is not recognized.' },
  '0x1644e049': { name: 'InvalidDscProof', message: 'The document signing certificate proof is invalid.' },
  '0x422cc3b7': { name: 'InvalidPubkey', message: 'The public key provided is invalid.' },
  '0x4cb305bb': {
    name: 'InvalidDscCommitmentRoot',
    message: 'The document signing certificate commitment root is invalid.',
  },
  '0x61296fbb': { name: 'CrossChainIsNotSupportedYet', message: 'Cross-chain verification is not supported yet.' },
  '0x65ec0cf1': { name: 'InputTooShort', message: 'The input data is too short.' },
  '0x67b61dc7': { name: 'InvalidRegisterProof', message: 'The registration proof is invalid.' },
  '0x6f26ab8d': { name: 'InvalidUidaiTimestamp', message: 'The Aadhaar document timestamp is invalid.' },
  '0x8f1b44c7': { name: 'InvalidCscaRoot', message: 'The country signing certificate authority root is invalid.' },
  '0x94ec3503': { name: 'UserContextDataTooShort', message: 'User context data is too short.' },
  '0xace124bc': { name: 'ConfigNotSet', message: 'The verification configuration has not been set.' },
  '0xc67a44d2': { name: 'InvalidOfacRoots', message: 'The OFAC check roots are invalid.' },
  '0xcf46551c': {
    name: 'CurrentDateNotInValidRange',
    message: 'The current date is outside the valid range for verification.',
  },
  '0xd7ca437d': { name: 'AttestationIdMismatch', message: 'The attestation ID does not match the expected value.' },
  '0xda7bd3a6': { name: 'InvalidVcAndDiscloseProof', message: 'The verification and disclosure proof is invalid.' },
  '0xe7bee380': { name: 'ScopeMismatch', message: 'The verification scope does not match.' },
  '0xebbcc178': { name: 'InvalidUserIdentifierInProof', message: 'The user identifier in the proof is invalid.' },
  '0xebc2fedc': { name: 'InvalidPubkeyCommitment', message: 'The public key commitment is invalid.' },
  '0xf53393a7': {
    name: 'InvalidIdentityCommitmentRoot',
    message: 'The identity commitment root is invalid or outdated.',
  },
  '0xff633a38': { name: 'LengthMismatch', message: 'Input array lengths do not match.' },

  // IdentityVerificationHubImplV1 (legacy)
  '0x899ef10d': { name: 'LENGTH_MISMATCH', message: 'Input array lengths do not match.' },
  '0x8e727f46': { name: 'NO_VERIFIER_SET', message: 'No verifier has been configured for this attestation type.' },
  '0xed8cf9ff': {
    name: 'CURRENT_DATE_NOT_IN_VALID_RANGE',
    message: 'The current date is outside the valid range for verification.',
  },
  '0xf0e539b9': { name: 'INVALID_OLDER_THAN', message: 'The minimum age requirement check failed.' },
  '0xbf21b11c': { name: 'INVALID_FORBIDDEN_COUNTRIES', message: 'The forbidden countries check failed.' },
  '0x71b125ed': { name: 'INVALID_OFAC', message: 'The OFAC sanctions check failed.' },
  '0x9003ac4d': { name: 'INVALID_REGISTER_PROOF', message: 'The registration proof is invalid.' },
  '0x6a86dd76': { name: 'INVALID_DSC_PROOF', message: 'The document signing certificate proof is invalid.' },
  '0xd4d37a7a': { name: 'INVALID_VC_AND_DISCLOSE_PROOF', message: 'The verification and disclosure proof is invalid.' },
  '0x52906601': { name: 'INVALID_COMMITMENT_ROOT', message: 'The identity commitment root is invalid or outdated.' },
  '0x1ce3d3ca': { name: 'INVALID_OFAC_ROOT', message: 'The OFAC check root is invalid.' },
  '0xa294ad3c': { name: 'INVALID_CSCA_ROOT', message: 'The country signing certificate authority root is invalid.' },
  '0xe0f15544': { name: 'INVALID_REVEALED_DATA_TYPE', message: 'The revealed data type is not recognized.' },

  // Registry errors
  '0x034acfcc': { name: 'REGISTERED_COMMITMENT', message: 'This identity has already been registered.' },
  '0x4ffa9998': { name: 'HUB_NOT_SET', message: 'The verification hub has not been configured.' },
  '0xba0318cb': { name: 'ONLY_HUB_CAN_ACCESS', message: 'Only the verification hub can perform this action.' },
  '0x22697ffa': { name: 'HUB_ADDRESS_ZERO', message: 'The hub address cannot be zero.' },
  '0x2822d0cb': {
    name: 'ONLY_TEE_CAN_ACCESS',
    message: 'Only the trusted execution environment can perform this action.',
  },
  '0xfc833fc6': { name: 'TEE_NOT_SET', message: 'The trusted execution environment has not been configured.' },
  '0x712eb087': { name: 'INVALID_PROOF', message: 'The proof is invalid.' },
  '0xee57533e': { name: 'INVALID_ROOT_CA', message: 'The root certificate authority is invalid.' },
  '0x7f91b413': { name: 'INVALID_IMAGE', message: 'The provided image is invalid.' },
  '0x118818d1': { name: 'INVALID_TIMESTAMP', message: 'The timestamp is invalid.' },

  // Verification root errors
  '0xa512e2ff': { name: 'InvalidDataFormat', message: 'The data format is invalid.' },
  '0x5c427cd9': { name: 'UnauthorizedCaller', message: 'The caller is not authorized to perform this action.' },

  // Library errors
  '0xe048e710': { name: 'RegistryNotSet', message: 'The identity registry has not been configured.' },
  '0x49aecbc2': { name: 'InvalidOlderThan', message: 'The minimum age requirement check failed.' },
  '0x5fb542f4': { name: 'InvalidOfacCheck', message: 'The OFAC sanctions check failed.' },
  '0x82cba848': { name: 'InvalidForbiddenCountries', message: 'The forbidden countries check failed.' },
  '0x0b42b970': { name: 'InvalidPubSignalsLength', message: 'The public signals array has an unexpected length.' },

  // Common example/integrator errors
  '0x09bde339': { name: 'InvalidProof', message: 'The proof is invalid.' },
  '0x646cf558': { name: 'AlreadyClaimed', message: 'This reward has already been claimed.' },
  '0xbfc6c337': { name: 'NotRegistered', message: 'This address is not registered.' },
  '0xf0c426db': { name: 'InvalidUserIdentifier', message: 'The user identifier is invalid.' },
  '0x29393238': {
    name: 'UserIdentifierAlreadyRegistered',
    message: 'This user identifier has already been registered.',
  },
  '0x22cbc6a2': { name: 'RegisteredNullifier', message: 'This nullifier has already been used.' },
  '0x153745d3': { name: 'RegistrationNotOpen', message: 'Registration is not currently open.' },
  '0x697e379b': { name: 'RegistrationNotClosed', message: 'Registration has not closed yet.' },
  '0x6b687806': { name: 'ClaimNotOpen', message: 'Claims are not currently open.' },
  '0x5dd09265': { name: 'UserIdentifierAlreadyMinted', message: 'An NFT has already been minted for this identifier.' },
};

const SELECTOR_REGEX = /^0x[0-9a-fA-F]{8,}$/;

const OPENCHAIN_API = 'https://api.openchain.xyz/signature-database/v1/lookup';

function matchesSelector(value: string): boolean {
  return SELECTOR_REGEX.test(value);
}

/**
 * Attempts to decode a contract error from raw hex revert data or a hex error selector.
 * Returns a human-readable message if the selector is recognized, or null otherwise.
 */
export function decodeContractError(errorData: string): string | null {
  if (!errorData || !matchesSelector(errorData)) {
    return null;
  }

  const selector = errorData.slice(0, 10).toLowerCase();
  const entry = ERROR_SELECTOR_MAP[selector];
  return entry?.message ?? null;
}

/**
 * Converts a Solidity error signature like "InvalidVcAndDiscloseProof()" or
 * "REGISTERED_COMMITMENT()" into a human-readable form like
 * "Invalid Vc And Disclose Proof" or "Registered Commitment".
 */
export function formatErrorSignature(signature: string): string {
  const name = signature.replace(/\(.*\)$/, '');

  if (name === name.toUpperCase() && name.includes('_')) {
    return name
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/**
 * Returns a human-readable version of an error string if it's a known contract error selector,
 * otherwise returns the original string unchanged.
 */
export function humanizeError(error: string): string {
  return decodeContractError(error) ?? error;
}

/**
 * Async version of humanizeError that also tries the openchain.xyz API for unknown selectors.
 * Falls back to the sync result if the lookup fails or times out.
 */
export async function humanizeErrorAsync(error: string): Promise<string> {
  const syncResult = humanizeError(error);
  if (syncResult !== error || !matchesSelector(error)) {
    return syncResult;
  }

  const resolved = await lookupErrorSelector(error);
  return resolved ?? syncResult;
}

/**
 * Checks whether a string looks like a hex error selector (0x + 8+ hex chars).
 */
export function isErrorSelector(value: string): boolean {
  return matchesSelector(value);
}

/**
 * Looks up an unknown error selector via the openchain.xyz signature database.
 * Returns the formatted error name if found, or null.
 */
export async function lookupErrorSelector(selector: string): Promise<string | null> {
  const normalized = selector.slice(0, 10).toLowerCase();
  try {
    const response = await fetch(`${OPENCHAIN_API}?function=${normalized}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      ok: boolean;
      result: { function: Record<string, Array<{ name: string }>> };
    };

    const match = data?.result?.function?.[normalized]?.[0]?.name;
    if (!match) return null;

    return formatErrorSignature(match);
  } catch {
    return null;
  }
}
