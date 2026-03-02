export const MAX_FIELD_BYTE_SIZE = 31;
export const NAME_MAX_LENGTH = 2 * MAX_FIELD_BYTE_SIZE; // 62 bytes
export const TOTAL_REVEAL_DATA_LENGTH = 119;

export const AADHAAR_PUBLIC_SIGNAL_INDICES = {
  ATTESTATION_ID: 0,
  CURRENT_YEAR: 1,
  CURRENT_MONTH: 2,
  CURRENT_DAY: 3,
  OFAC_NAME_DOB_SMT_ROOT: 4,
  OFAC_NAME_YOB_SMT_ROOT: 5,
  MERKLE_ROOT: 6,
  SCOPE: 7,
  USER_IDENTIFIER: 8,
  NULLIFIER: 9,
  REVEAL_PHOTO_HASH: 10,
  REVEAL_DATA_PACKED_START: 11,
  REVEAL_DATA_PACKED_END: 14,
  FORBIDDEN_COUNTRIES_LIST_PACKED_START: 15,
  FORBIDDEN_COUNTRIES_LIST_PACKED_END: 18,
} as const;

export const FIELD_LENGTHS = {
  GENDER: 1,
  YEAR_OF_BIRTH: 4,
  MONTH_OF_BIRTH: 2,
  DAY_OF_BIRTH: 2,
  NAME: NAME_MAX_LENGTH,
  AADHAAR_LAST_4_DIGITS: 4,
  PINCODE: 6,
  STATE: MAX_FIELD_BYTE_SIZE,
  PHONE_LAST_4_DIGITS: 4,
  OFAC_NAME_DOB_CHECK: 1,
  OFAC_NAME_YOB_CHECK: 1,
  MINIMUM_AGE_VALID: 1,
} as const;

export const REVEAL_DATA_INDICES = {
  GENDER: 0,
  YEAR_OF_BIRTH_START: 1,
  MONTH_OF_BIRTH_START: 5,
  DAY_OF_BIRTH_START: 7,
  NAME_START: 9,
  AADHAAR_LAST_4_DIGITS_START: 71,
  PINCODE_START: 75,
  STATE_START: 81,
  PHONE_LAST_4_DIGITS_START: 112,
  OFAC_NAME_DOB_CHECK: 116,
  OFAC_NAME_YOB_CHECK: 117,
  MINIMUM_AGE_VALID: 118,
  OFAC_NAME_DOB_REVERSE_CHECK: 119,
  OFAC_NAME_YOB_REVERSE_CHECK: 120,
} as const;

export const REVEAL_DATA_RANGES = {
  GENDER: [REVEAL_DATA_INDICES.GENDER, REVEAL_DATA_INDICES.GENDER + FIELD_LENGTHS.GENDER] as const,
  YEAR_OF_BIRTH: [
    REVEAL_DATA_INDICES.YEAR_OF_BIRTH_START,
    REVEAL_DATA_INDICES.YEAR_OF_BIRTH_START + FIELD_LENGTHS.YEAR_OF_BIRTH,
  ] as const,
  MONTH_OF_BIRTH: [
    REVEAL_DATA_INDICES.MONTH_OF_BIRTH_START,
    REVEAL_DATA_INDICES.MONTH_OF_BIRTH_START + FIELD_LENGTHS.MONTH_OF_BIRTH,
  ] as const,
  DAY_OF_BIRTH: [
    REVEAL_DATA_INDICES.DAY_OF_BIRTH_START,
    REVEAL_DATA_INDICES.DAY_OF_BIRTH_START + FIELD_LENGTHS.DAY_OF_BIRTH,
  ] as const,
  NAME: [
    REVEAL_DATA_INDICES.NAME_START,
    REVEAL_DATA_INDICES.NAME_START + FIELD_LENGTHS.NAME,
  ] as const,
  AADHAAR_LAST_4_DIGITS: [
    REVEAL_DATA_INDICES.AADHAAR_LAST_4_DIGITS_START,
    REVEAL_DATA_INDICES.AADHAAR_LAST_4_DIGITS_START + FIELD_LENGTHS.AADHAAR_LAST_4_DIGITS,
  ] as const,
  PINCODE: [
    REVEAL_DATA_INDICES.PINCODE_START,
    REVEAL_DATA_INDICES.PINCODE_START + FIELD_LENGTHS.PINCODE,
  ] as const,
  STATE: [
    REVEAL_DATA_INDICES.STATE_START,
    REVEAL_DATA_INDICES.STATE_START + FIELD_LENGTHS.STATE,
  ] as const,
  PHONE_LAST_4_DIGITS: [
    REVEAL_DATA_INDICES.PHONE_LAST_4_DIGITS_START,
    REVEAL_DATA_INDICES.PHONE_LAST_4_DIGITS_START + FIELD_LENGTHS.PHONE_LAST_4_DIGITS,
  ] as const,
  OFAC_NAME_DOB_CHECK: [
    REVEAL_DATA_INDICES.OFAC_NAME_DOB_CHECK,
    REVEAL_DATA_INDICES.OFAC_NAME_DOB_CHECK + FIELD_LENGTHS.OFAC_NAME_DOB_CHECK,
  ] as const,
  OFAC_NAME_YOB_CHECK: [
    REVEAL_DATA_INDICES.OFAC_NAME_YOB_CHECK,
    REVEAL_DATA_INDICES.OFAC_NAME_YOB_CHECK + FIELD_LENGTHS.OFAC_NAME_YOB_CHECK,
  ] as const,
  MINIMUM_AGE_VALID: [
    REVEAL_DATA_INDICES.MINIMUM_AGE_VALID,
    REVEAL_DATA_INDICES.MINIMUM_AGE_VALID + FIELD_LENGTHS.MINIMUM_AGE_VALID,
  ] as const,
} as const;

export const SELECTOR_BITS = {
  GENDER: [0] as const,
  YEAR_OF_BIRTH: [1, 2, 3, 4] as const,
  MONTH_OF_BIRTH: [5, 6] as const,
  DAY_OF_BIRTH: [7, 8] as const,
  NAME: Array.from({ length: NAME_MAX_LENGTH }, (_, i) => i + 9) as number[],
  AADHAAR_LAST_4_DIGITS: [71, 72, 73, 74] as const,
  PINCODE: [75, 76, 77, 78, 79, 80] as const,
  STATE: Array.from({ length: MAX_FIELD_BYTE_SIZE }, (_, i) => i + 81) as number[],
  PHONE_LAST_4_DIGITS: [112, 113, 114, 115] as const,
  PHOTO_HASH: [116] as const,
  OFAC_NAME_DOB_CHECK: [117] as const,
  OFAC_NAME_YOB_CHECK: [118] as const,
} as const;

export type AadhaarField = keyof typeof FIELD_LENGTHS;

export function extractField(unpackedData: string[], field: AadhaarField): string | number {
  const range = REVEAL_DATA_RANGES[field];
  if (range[1] - range[0] === 1) {
    const value = unpackedData[range[0]];
    if (
      field === 'OFAC_NAME_DOB_CHECK' ||
      field === 'OFAC_NAME_YOB_CHECK' ||
      field === 'MINIMUM_AGE_VALID'
    ) {
      return value.charCodeAt(0);
    }
    return value;
  }
  return unpackedData.slice(range[0], range[1]).join('').replace(/\0+$/, '');
}

import type { DisclosureField } from '../interface.js';

const DISCLOSURE_TO_AADHAAR: Record<DisclosureField, AadhaarField[]> = {
  name: ['NAME'],
  gender: ['GENDER'],
  date_of_birth: ['YEAR_OF_BIRTH', 'MONTH_OF_BIRTH', 'DAY_OF_BIRTH'],
  nationality: [],
  id_number: ['AADHAAR_LAST_4_DIGITS'],
  issuing_state: ['STATE'],
  expiry_date: [],
  ofac: ['OFAC_NAME_DOB_CHECK', 'OFAC_NAME_YOB_CHECK'],
  older_than: [],
};

export function disclosureToAadhaarSelector(fields: DisclosureField[]): bigint {
  const aadhaarFields: AadhaarField[] = fields.flatMap(f => DISCLOSURE_TO_AADHAAR[f] ?? []);
  return createSelector(aadhaarFields);
}

export function createSelector(fieldsToReveal: AadhaarField[]): bigint {
  const bits = Array(119).fill(0);

  for (const field of fieldsToReveal) {
    if (field === 'MINIMUM_AGE_VALID') continue;

    const selectorBits = SELECTOR_BITS[field as keyof typeof SELECTOR_BITS];
    for (const bit of selectorBits) {
      bits[bit] = 1;
    }
  }

  let result = 0n;
  for (let i = 0; i < 121; i++) {
    if (bits[i]) {
      result += 1n << BigInt(i);
    }
  }

  return result;
}
