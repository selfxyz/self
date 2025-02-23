import { CIRCUIT_CONSTANTS } from '../../../../common/src/constants/constants';
import { castToUserIdentifier, UserIdType } from '../../../../common/src/utils/circuits/uuid';
import { BigNumberish } from 'ethers';
import { PublicSignals } from 'snarkjs';

export function parseSolidityCalldata<T>(rawCallData: string, _type: T): T {
  const parsed = JSON.parse('[' + rawCallData + ']');

  return {
    a: parsed[0].map((x: string) => x.replace(/"/g, '')) as [BigNumberish, BigNumberish],
    b: parsed[1].map((arr: string[]) => arr.map((x: string) => x.replace(/"/g, ''))) as [
      [BigNumberish, BigNumberish],
      [BigNumberish, BigNumberish],
    ],
    c: parsed[2].map((x: string) => x.replace(/"/g, '')) as [BigNumberish, BigNumberish],
    pubSignals: parsed[3].map((x: string) => x.replace(/"/g, '')) as BigNumberish[],
  } as T;
}

export async function getUserIdentifier(publicSignals: PublicSignals, user_identifier_type: UserIdType = 'uuid'): Promise<string> {
  return castToUserIdentifier(
    BigInt(publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]),
    user_identifier_type
  );
}
