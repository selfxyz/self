import { poseidon3, poseidon5 } from 'poseidon-lite';

import { packBytes } from '../foundation/bytes.js';
import { LeafBuilder, generateSmallKey, MONTH_MAP } from './leafBuilder.js';
import type { OfacEntry } from './leafBuilder.js';

const AADHAAR_NAME_PAD_LENGTH = 62;

function packName(name: string): bigint[] {
  const padded = name
    .toUpperCase()
    .padEnd(AADHAAR_NAME_PAD_LENGTH, '\0')
    .split('')
    .map((char) => char.charCodeAt(0));
  return packBytes(padded) as bigint[];
}

/**
 * Aadhaar leaf builder for OFAC SMT trees.
 *
 * Names: "FIRSTNAME LASTNAME" uppercased, padded to 62 chars, packed via packBytes.
 * Unlike passport/kyc, Aadhaar combines name + date in a single poseidon call:
 *   nameDob = poseidon5([packed[0], packed[1], year, month, day])
 *   nameYob = poseidon3([packed[0], packed[1], year])
 */
export class AadhaarLeafBuilder extends LeafBuilder {
  readonly supportsReverse = true;

  protected hashName(firstName: string, lastName: string): bigint {
    return packName(firstName + ' ' + lastName)[0];
  }

  protected hashDob(_entry: OfacEntry): bigint {
    return BigInt(0); // Combined in getNameDobLeaf override
  }

  protected hashYob(_entry: OfacEntry): bigint {
    return BigInt(0); // Combined in getNameYobLeaf override
  }

  override getNameDobLeaf(entry: OfacEntry): bigint {
    if (!entry.First_Name || !entry.Last_Name) return BigInt(0);
    if (entry.day == null || entry.month == null || entry.year == null) return BigInt(0);
    const mapped = MONTH_MAP[entry.month.toLowerCase()];
    if (!mapped) return BigInt(0);
    const packed = packName(entry.First_Name + ' ' + entry.Last_Name);
    return generateSmallKey(
      poseidon5([packed[0], packed[1], BigInt(entry.year), BigInt(mapped), BigInt(entry.day)])
    );
  }

  override getNameYobLeaf(entry: OfacEntry): bigint {
    if (!entry.First_Name || !entry.Last_Name) return BigInt(0);
    if (entry.year == null) return BigInt(0);
    const packed = packName(entry.First_Name + ' ' + entry.Last_Name);
    return generateSmallKey(poseidon3([packed[0], packed[1], BigInt(entry.year)]));
  }
}

/** Convenience leaf functions for circuit inputs (take pre-formatted data). */
export function getNameDobLeafAadhaar(
  name: string,
  year: string,
  month: string,
  day: string
): bigint {
  const packed = packName(name);
  return generateSmallKey(
    poseidon5([packed[0], packed[1], BigInt(year), BigInt(month), BigInt(day)])
  );
}

export function getNameYobLeafAadhaar(name: string, year: string): bigint {
  const packed = packName(name);
  return generateSmallKey(poseidon3([packed[0], packed[1], BigInt(year)]));
}

export const aadhaarLeafBuilder = new AadhaarLeafBuilder();
