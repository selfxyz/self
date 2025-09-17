import { PublicSignals } from 'snarkjs';
import { discloseIndices } from './constants.js';
import { AttestationId } from 'src/types/types.js';
import { ProofError } from '../errors/index.js';

/**
 * Returns the number of public signals containing revealed data for the specified attestation ID.
 *
 * Throws an error if the attestation ID is not supported.
 *
 * @param attestationId - The attestation ID for which to determine the number of revealed data public signals
 * @returns The number of public signals corresponding to revealed data
 */
export function getRevealedDataPublicSignalsLength(attestationId: AttestationId): number {
  switch (attestationId) {
    case 1:
      return 93 / 31;
    case 2:
      return Math.ceil(94 / 31);
    case 3:
      return Math.ceil(119 / 31);
    default:
      throw new ProofError(`Invalid attestation ID: ${attestationId}`);
  }
}

export const bytesCount: Record<AttestationId, number[]> = {
  1: [31, 31, 31],
  2: [31, 31, 31, 1],
  3: [31, 31, 31, 26],
};

/**
 * Extracts and returns the revealed data bytes from the public signals for a given attestation ID.
 *
 * Iterates over the relevant public signals, unpacks each into its constituent bytes according to the attestation's byte structure, and accumulates all revealed bytes into a single array.
 *
 * @param attestationId - The attestation ID specifying the format of revealed data
 * @param publicSignals - The array of public signals containing packed revealed data
 * @returns An array of bytes representing the revealed data for the specified attestation
 */
export function getRevealedDataBytes(
  attestationId: AttestationId,
  publicSignals: PublicSignals
): number[] {
  let bytes: number[] = [];
  for (let i = 0; i < getRevealedDataPublicSignalsLength(attestationId); i++) {
    let publicSignal = BigInt(
      publicSignals[discloseIndices[attestationId].revealedDataPackedIndex + i]
    );
    for (let j = 0; j < bytesCount[attestationId][i]; j++) {
      bytes.push(Number(publicSignal & 0xffn));
      publicSignal = publicSignal >> 8n;
    }
  }

  return bytes;
}
