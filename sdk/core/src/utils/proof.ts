import { PublicSignals } from 'snarkjs';
import { discloseIndices } from './constants.js';
import { AttestationId } from 'src/types/types.js';

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

  return bytes;
}
