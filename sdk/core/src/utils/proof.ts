import { PublicSignals } from 'snarkjs';
import { AttestationId, discloseIndices } from './constants.js';

export function getRevealedDataPublicSignalsLength(attestationId: AttestationId): number {
  switch (attestationId) {
    case 1:
      return 93 / 31;
    case 2:
      return Math.ceil(94 / 31);
    default:
      throw new Error(`Invalid attestation ID: ${attestationId}`);
  }
}

export const bytesCount: Record<AttestationId, number[]> = {
  1: [31, 31, 31],
  2: [31, 31, 31, 1],
};

export function getRevealedDataBytes(attestationId: AttestationId, publicSignals: PublicSignals): number[] {
  let bytes: number[] = [];
  for (let i = 0; i < getRevealedDataPublicSignalsLength(attestationId); i++) {
    let publicSignal = BigInt(publicSignals[discloseIndices[attestationId].revealedDataPackedIndex + i]);
    for (let j = 0; j < bytesCount[attestationId][i]; j++) {
      bytes.push(Number(publicSignal & 0xffn));
      publicSignal = publicSignal >> 8n;
    }
  }
  console.log(bytes);

  return bytes;
}

// export async function getUserIdentifier(
//   publicSignals: PublicSignals,
//   user_identifier_type: UserIdType = 'uuid'
// ): Promise<string> {
//   return castToUserIdentifier(
//     BigInt(publicSignals[CIRCUIT_CONSTANTS.VC_AND_DISCLOSE_USER_IDENTIFIER_INDEX]),
//     user_identifier_type
//   );
// }
