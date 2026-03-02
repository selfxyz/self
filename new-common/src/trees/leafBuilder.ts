import { poseidon2 } from 'poseidon-lite';

import { OFAC_TREE_LEVELS } from '../foundation/constants/circuit.js';

export function generateSmallKey(input: bigint): bigint {
  return input % (BigInt(1) << BigInt(OFAC_TREE_LEVELS));
}

export const MONTH_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

export function cleanName(name: string): string {
  return name.replace(/'/g, '').replace(/\./g, '').replace(/[- ]/g, '<');
}

export interface OfacEntry {
  First_Name: string;
  Last_Name: string;
  day?: string;
  month?: string;
  year?: string;
  Pass_No?: string;
  Pass_Country?: string;
}

/**
 * Abstract base for OFAC leaf generation across document types.
 *
 * The leaf composition is always: smallKey(poseidon2([dateHash, nameHash])).
 * Subclasses own all formatting and hashing for their document type.
 *
 * supportsReverse: aadhaar/kyc generate a second leaf with first/last swapped.
 */
export abstract class LeafBuilder {
  abstract readonly supportsReverse: boolean;

  protected abstract hashName(firstName: string, lastName: string): bigint;
  protected abstract hashDob(entry: OfacEntry): bigint;
  protected abstract hashYob(entry: OfacEntry): bigint;

  getNameDobLeaf(entry: OfacEntry): bigint {
    if (!entry.First_Name || !entry.Last_Name) return BigInt(0);
    const nameHash = this.hashName(entry.First_Name, entry.Last_Name);
    const dobHash = this.hashDob(entry);
    if (nameHash === BigInt(0) || dobHash === BigInt(0)) return BigInt(0);
    return generateSmallKey(poseidon2([dobHash, nameHash]));
  }

  getNameYobLeaf(entry: OfacEntry): bigint {
    if (!entry.First_Name || !entry.Last_Name) return BigInt(0);
    const nameHash = this.hashName(entry.First_Name, entry.Last_Name);
    const yobHash = this.hashYob(entry);
    if (nameHash === BigInt(0) || yobHash === BigInt(0)) return BigInt(0);
    return generateSmallKey(poseidon2([yobHash, nameHash]));
  }

  getReverseNameDobLeaf(entry: OfacEntry): bigint {
    return this.getNameDobLeaf({
      ...entry,
      First_Name: entry.Last_Name,
      Last_Name: entry.First_Name,
    });
  }

  getReverseNameYobLeaf(entry: OfacEntry): bigint {
    return this.getNameYobLeaf({
      ...entry,
      First_Name: entry.Last_Name,
      Last_Name: entry.First_Name,
    });
  }
}
