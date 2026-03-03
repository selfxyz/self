import { poseidon2, poseidon3, poseidon6 } from 'poseidon-lite';
import countries from 'i18n-iso-countries';
// @ts-ignore
import en from 'i18n-iso-countries/langs/en.json' with { type: 'json' };

import { stringToAsciiBigIntArray } from '../circuits/userId.js';
import type { ChildNodes, SMT } from '@openpassport/zk-kit-smt';
import { SMT as SMTClass } from '@openpassport/zk-kit-smt';

import type { LeafBuilder, OfacEntry } from './leafBuilder.js';
import { PassportLeafBuilder } from './passportLeafBuilder.js';

countries.registerLocale(en);

function createSMT(): SMT {
  const hash2 = (childNodes: ChildNodes) =>
    childNodes.length === 2 ? poseidon2(childNodes) : poseidon3(childNodes);
  return new SMTClass(hash2, true);
}

function addLeafIfNew(tree: SMT, leaf: bigint): boolean {
  if (leaf === BigInt(0) || tree.createProof(leaf).membership) return false;
  tree.add(leaf, BigInt(1));
  return true;
}

/**
 * Single SMT builder for all document types.
 *
 * The builder handles name cleaning, date formatting, and hashing.
 * If builder.supportsReverse, a second leaf with swapped first/last is also added.
 *
 * treeType: 'name_and_dob' | 'name_and_yob' | 'passport_no_and_nationality'
 */
export function buildSMT(
  field: OfacEntry[],
  treeType: string,
  builder: LeafBuilder,
): [number, number, SMT] {
  let count = 0;
  const startTime = performance.now();
  const tree = createSMT();

  for (let i = 0; i < field.length; i++) {
    const entry = field[i];
    let leaf = BigInt(0);

    if (treeType === 'passport_no_and_nationality') {
      if (!(builder instanceof PassportLeafBuilder)) {
        throw new Error('passport_no_and_nationality requires a PassportLeafBuilder');
      }
      const countryCode = getCountryCode(entry.Pass_Country ?? '');
      if (!countryCode) continue;
      leaf = builder.getPassportNumberAndNationalityLeaf(entry, countryCode);
    } else if (treeType.startsWith('name_and_dob')) {
      leaf = builder.getNameDobLeaf(entry);
    } else if (treeType.startsWith('name_and_yob')) {
      leaf = builder.getNameYobLeaf(entry);
    }

    if (!addLeafIfNew(tree, leaf)) continue;
    count++;

    if (builder.supportsReverse) {
      let reverseLeaf = BigInt(0);
      if (treeType.startsWith('name_and_dob')) {
        reverseLeaf = builder.getReverseNameDobLeaf(entry);
      } else if (treeType.startsWith('name_and_yob')) {
        reverseLeaf = builder.getReverseNameYobLeaf(entry);
      }
      if (reverseLeaf !== leaf && addLeafIfNew(tree, reverseLeaf)) count++;
    }
  }

  return [count, performance.now() - startTime, tree];
}

// ─── Pre-bound builders ───

import { passportLeafBuilder, idCardLeafBuilder } from './passportLeafBuilder.js';
import { aadhaarLeafBuilder } from './aadhaarLeafBuilder.js';
import { kycLeafBuilder } from './kycLeafBuilder.js';

export function buildPassportSMT(field: OfacEntry[], treeType: string): [number, number, SMT] {
  return buildSMT(field, treeType, passportLeafBuilder);
}

export function buildIdCardSMT(field: OfacEntry[], treeType: string): [number, number, SMT] {
  return buildSMT(field, treeType, idCardLeafBuilder);
}

export function buildAadhaarSMT(field: OfacEntry[], treeType: string): [number, number, SMT] {
  return buildSMT(field, treeType, aadhaarLeafBuilder);
}

export function buildKycSMT(field: OfacEntry[], treeType: string): [number, number, SMT] {
  return buildSMT(field, treeType, kycLeafBuilder);
}

// ─── Country leaf (for circuit inputs, not tree building) ───

export function getCountryLeaf(
  country_by: (bigint | number)[],
  country_to: (bigint | number)[],
): bigint {
  if (country_by.length !== 3 || country_to.length !== 3) return BigInt(0);
  return poseidon6(country_by.concat(country_to));
}

// ─── Country code resolution ───

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  palestinian: 'Palestine',
  'korea, north': 'North Korea',
  'korea, south': 'Korea, Republic of',
  'united kingdom': 'United Kingdom',
  syria: 'Syrian Arab Republic',
  burma: 'Myanmar',
  'cabo verde': 'Cape Verde',
  'congo, democratic republic of the': 'Democratic Republic of the Congo',
  macau: 'Macao',
};

export function getCountryCode(countryName: string): string | undefined {
  const normalized = COUNTRY_NAME_ALIASES[countryName.toLowerCase()] || countryName;
  return countries.getAlpha3Code(normalized, 'en');
}
