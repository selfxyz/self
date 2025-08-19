import type { PassportData } from '@selfxyz/common/types';
import { generateCircuitInputsRegister, getCircuitNameFromPassportData } from '@selfxyz/common/utils';

/**
 * Generate circuit inputs and endpoint metadata for a registration proof.
 *
 * @param secret - User's secret used for witness generation.
 * @param passportData - Parsed passport data.
 * @param dscTree - Serialized DSC Merkle tree.
 * @param env - Target environment, production or staging.
 */
export function registerInputs(secret: string, passportData: PassportData, dscTree: string, env: 'prod' | 'stg') {
  const inputs = generateCircuitInputsRegister(secret, passportData, dscTree);
  const circuitName = getCircuitNameFromPassportData(passportData, 'register');
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}
