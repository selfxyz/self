import { poseidon2, poseidon3, poseidon6, poseidon10, poseidon12, poseidon13 } from 'poseidon-lite';

import { stringToAsciiBigIntArray } from '../circuits/userId.js';
import { LeafBuilder, generateSmallKey, MONTH_MAP, cleanName } from './leafBuilder.js';
import type { OfacEntry } from './leafBuilder.js';

/**
 * Passport/ID card leaf builder for OFAC SMT trees.
 *
 * Names: MRZ format — "LASTNAME<<FIRSTNAME" padded to targetLength (39 passport, 30 id_card),
 *   chunked into 3 groups → poseidon13 or poseidon10 per chunk → poseidon3.
 * DOB: YYMMDD → 6 ASCII bigints → poseidon6.
 * YOB: YY → 2 ASCII bigints → poseidon2.
 */
export class PassportLeafBuilder extends LeafBuilder {
  readonly supportsReverse = false;
  private readonly targetLength: 39 | 30;

  constructor(docType: 'passport' | 'id_card' = 'passport') {
    super();
    this.targetLength = docType === 'id_card' ? 30 : 39;
  }

  protected hashName(firstName: string, lastName: string): bigint {
    const cleanFirst = cleanName(firstName);
    const cleanLast = cleanName(lastName);
    let arr = (cleanLast ? cleanLast + '<<' : '') + cleanFirst;
    if (arr.length === 0) return BigInt(0);
    arr =
      arr.length > this.targetLength
        ? arr.substring(0, this.targetLength)
        : arr.padEnd(this.targetLength, '<');
    return hashNameMrz(stringToAsciiBigIntArray(arr));
  }

  protected hashDob(entry: OfacEntry): bigint {
    const mapped = MONTH_MAP[entry.month?.toLowerCase() ?? ''];
    if (!mapped || !entry.day || entry.day.length !== 2 || !entry.year || entry.year.length < 2) {
      return BigInt(0);
    }
    return hashDobMrz(stringToAsciiBigIntArray(entry.year.slice(-2) + mapped + entry.day));
  }

  protected hashYob(entry: OfacEntry): bigint {
    if (!entry.year || entry.year.length < 2) return BigInt(0);
    const arr = stringToAsciiBigIntArray(entry.year.slice(-2));
    if (arr.length !== 2) return BigInt(0);
    return poseidon2(arr);
  }

  /**
   * Level 3 OFAC match: passport number (9) + nationality (3) → poseidon12.
   */
  getPassportNumberAndNationalityLeaf(entry: OfacEntry, countryCode: string): bigint {
    let passNo = entry.Pass_No ?? '';
    passNo = passNo.length < 9 ? passNo.padEnd(9, '<') : passNo.substring(0, 9);
    return getPassportNumberAndNationalityLeafFromMrz(
      stringToAsciiBigIntArray(passNo),
      stringToAsciiBigIntArray(countryCode),
    );
  }
}

// ─── Standalone functions for circuit inputs (take pre-formatted MRZ arrays) ───

export function hashNameMrz(nameMrz: (bigint | number)[]): bigint {
  const middleChunks: bigint[] = [];

  if (nameMrz.length === 39) {
    middleChunks.push(
      poseidon13(nameMrz.slice(0, 13)),
      poseidon13(nameMrz.slice(13, 26)),
      poseidon13(nameMrz.slice(26, 39)),
    );
  } else if (nameMrz.length === 30) {
    middleChunks.push(
      poseidon10(nameMrz.slice(0, 10)),
      poseidon10(nameMrz.slice(10, 20)),
      poseidon10(nameMrz.slice(20, 30)),
    );
  } else {
    throw new Error(`Unsupported name MRZ length: ${nameMrz.length}`);
  }

  return poseidon3(middleChunks);
}

export function hashDobMrz(dobMrz: (bigint | number)[]): bigint {
  if (dobMrz.length !== 6) return BigInt(0);
  return poseidon6(dobMrz);
}

export function getNameDobLeafFromMrz(
  nameMrz: (bigint | number)[],
  dobMrz: (bigint | number)[],
): bigint {
  return generateSmallKey(poseidon2([hashDobMrz(dobMrz), hashNameMrz(nameMrz)]));
}

export function getNameYobLeafFromMrz(
  nameMrz: (bigint | number)[],
  yobMrz: (bigint | number)[],
): bigint {
  if (yobMrz.length !== 2) return BigInt(0);
  return generateSmallKey(poseidon2([poseidon2(yobMrz), hashNameMrz(nameMrz)]));
}

export function getPassportNumberAndNationalityLeafFromMrz(
  passport: (bigint | number)[],
  nationality: (bigint | number)[],
): bigint {
  if (passport.length !== 9) {
    throw new Error(`Passport number must be 9 elements, got ${passport.length}`);
  }
  if (nationality.length !== 3) {
    throw new Error(`Nationality must be 3 elements, got ${nationality.length}`);
  }
  return generateSmallKey(poseidon12(passport.concat(nationality)));
}

export const passportLeafBuilder = new PassportLeafBuilder();
export const idCardLeafBuilder = new PassportLeafBuilder('id_card');
