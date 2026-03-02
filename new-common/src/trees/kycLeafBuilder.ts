import { poseidon2, poseidon4, poseidon8 } from 'poseidon-lite';

import { packBytesAndPoseidon } from '../crypto/hash/poseidon.js';
import { stringToAsciiBigIntArray } from '../circuits/userId.js';
import { LeafBuilder, generateSmallKey, MONTH_MAP, cleanName } from './leafBuilder.js';
import type { OfacEntry } from './leafBuilder.js';

const KYC_NAME_PAD_LENGTH = 64;

function hashKycName(name: string): bigint {
  const padded = name
    .padEnd(KYC_NAME_PAD_LENGTH, '\0')
    .split('')
    .map(char => char.charCodeAt(0));
  return BigInt(packBytesAndPoseidon(padded));
}

/**
 * KYC leaf builder for OFAC SMT trees.
 *
 * Names: "FIRSTNAME LASTNAME" cleaned, padded to 64 chars → packBytesAndPoseidon.
 * DOB: YYYYMMDD → 8 ASCII bigints → poseidon8.
 * YOB: YYYY → 4 ASCII bigints → poseidon4.
 */
export class KycLeafBuilder extends LeafBuilder {
  readonly supportsReverse = true;

  protected hashName(firstName: string, lastName: string): bigint {
    return hashKycName(cleanName(firstName) + ' ' + cleanName(lastName));
  }

  protected hashDob(entry: OfacEntry): bigint {
    const mapped = MONTH_MAP[entry.month?.toLowerCase() ?? ''];
    if (!mapped || !entry.day || !entry.year) return BigInt(0);
    const dob = entry.year + mapped + entry.day;
    return BigInt(poseidon8(stringToAsciiBigIntArray(dob)));
  }

  protected hashYob(entry: OfacEntry): bigint {
    if (!entry.year) return BigInt(0);
    return BigInt(poseidon4(stringToAsciiBigIntArray(entry.year)));
  }
}

/** Convenience leaf functions for circuit inputs (take pre-formatted data). */
export function getNameDobLeafKyc(name: string, dob: string): bigint {
  const nameHash = hashKycName(name);
  const dobHash = BigInt(poseidon8(stringToAsciiBigIntArray(dob)));
  return generateSmallKey(poseidon2([dobHash, nameHash]));
}

export function getNameYobLeafKyc(name: string, yob: string): bigint {
  const nameHash = hashKycName(name);
  const yearHash = BigInt(poseidon4(stringToAsciiBigIntArray(yob)));
  return generateSmallKey(poseidon2([yearHash, nameHash]));
}

export const kycLeafBuilder = new KycLeafBuilder();
