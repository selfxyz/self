import type { PassportData } from '@selfxyz/common/types';
import { generateCircuitInputsRegister, getCircuitNameFromPassportData } from '@selfxyz/common/utils';

export function registerInputs(secret: string, passportData: PassportData, dscTree: string, env: 'prod' | 'stg') {
  const inputs = generateCircuitInputsRegister(secret, passportData, dscTree);
  const circuitName = getCircuitNameFromPassportData(passportData, 'register');
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}
