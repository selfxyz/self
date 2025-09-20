/* eslint-disable sort-exports/sort-exports */
export const MAX_FIELD_BYTE_SIZE = 31;
export const NAME_MAX_LENGTH = 2 * MAX_FIELD_BYTE_SIZE; // 62 bytes
export const TOTAL_REVEAL_DATA_LENGTH = 119;

// Public signal indices for vc_and_disclose_aadhaar circuit
export const AADHAAR_PUBLIC_SIGNAL_INDICES = {
  // Public inputs (0-10)
  ATTESTATION_ID: 0,
  CURRENT_YEAR: 1,
  CURRENT_MONTH: 2,
  CURRENT_DAY: 3,
  OFAC_NAME_DOB_SMT_ROOT: 4,
  OFAC_NAME_YOB_SMT_ROOT: 5,
  MERKLE_ROOT: 6,
  SCOPE: 7,
  USER_IDENTIFIER: 8,

  // Outputs (11+)
  NULLIFIER: 9,
  REVEAL_PHOTO_HASH: 10,
  REVEAL_DATA_PACKED_START: 11,
  REVEAL_DATA_PACKED_END: 14,
  FORBIDDEN_COUNTRIES_LIST_PACKED_START: 15,
  FORBIDDEN_COUNTRIES_LIST_PACKED_END: 18,
} as const;

export const getRevealDataPackedIndex = (chunkIndex: number): number => {
  if (chunkIndex < 0 || chunkIndex > 3) {
    throw new Error('revealData_packed chunk index must be 0-3');
  }
  return AADHAAR_PUBLIC_SIGNAL_INDICES.REVEAL_DATA_PACKED_START + chunkIndex;
};

export const getForbiddenCountriesListPackedIndex = (chunkIndex: number): number => {
  if (chunkIndex < 0 || chunkIndex > 3) {
    throw new Error('forbidden_countries_list_packed chunk index must be 0-3');
  }
  return AADHAAR_PUBLIC_SIGNAL_INDICES.FORBIDDEN_COUNTRIES_LIST_PACKED_START + chunkIndex;
};

export type AadhaarPublicSignal = keyof typeof AADHAAR_PUBLIC_SIGNAL_INDICES;

export function getPublicSignalValue(
  publicSignals: string[],
  signalName: AadhaarPublicSignal
): string {
  const index = AADHAAR_PUBLIC_SIGNAL_INDICES[signalName];
  if (index >= publicSignals.length) {
    throw new Error(`Public signal ${signalName} not found at index ${index}`);
  }
  return publicSignals[index];
}

export function getRevealDataPackedChunks(publicSignals: string[]): string[] {
  return publicSignals.slice(
    AADHAAR_PUBLIC_SIGNAL_INDICES.REVEAL_DATA_PACKED_START,
    AADHAAR_PUBLIC_SIGNAL_INDICES.REVEAL_DATA_PACKED_END + 1
  );
}

export function getForbiddenCountriesListPackedChunks(publicSignals: string[]): string[] {
  return publicSignals.slice(
    AADHAAR_PUBLIC_SIGNAL_INDICES.FORBIDDEN_COUNTRIES_LIST_PACKED_START,
    AADHAAR_PUBLIC_SIGNAL_INDICES.FORBIDDEN_COUNTRIES_LIST_PACKED_END + 1
  );
}

// Field lengths
export const FIELD_LENGTHS = {
  GENDER: 1,
  YEAR_OF_BIRTH: 4,
  MONTH_OF_BIRTH: 2,
  DAY_OF_BIRTH: 2,
  NAME: NAME_MAX_LENGTH, // 62
  AADHAAR_LAST_4_DIGITS: 4,
  PINCODE: 6,
  STATE: MAX_FIELD_BYTE_SIZE, // 31
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
  MINIMUM_AGE_VALID: 118, // Note: Always revealed, no selector control
  OFAC_NAME_DOB_REVERSE_CHECK: 119,
  OFAC_NAME_YOB_REVERSE_CHECK: 120,
} as const;

// End indices (exclusive) for each field in revealedDataPacked array
export const REVEAL_DATA_END_INDICES = {
  GENDER: REVEAL_DATA_INDICES.GENDER + FIELD_LENGTHS.GENDER,
  YEAR_OF_BIRTH_END: REVEAL_DATA_INDICES.YEAR_OF_BIRTH_START + FIELD_LENGTHS.YEAR_OF_BIRTH,
  MONTH_OF_BIRTH_END: REVEAL_DATA_INDICES.MONTH_OF_BIRTH_START + FIELD_LENGTHS.MONTH_OF_BIRTH,
  DAY_OF_BIRTH_END: REVEAL_DATA_INDICES.DAY_OF_BIRTH_START + FIELD_LENGTHS.DAY_OF_BIRTH,
  NAME_END: REVEAL_DATA_INDICES.NAME_START + FIELD_LENGTHS.NAME,
  AADHAAR_LAST_4_DIGITS_END:
    REVEAL_DATA_INDICES.AADHAAR_LAST_4_DIGITS_START + FIELD_LENGTHS.AADHAAR_LAST_4_DIGITS,
  PINCODE_END: REVEAL_DATA_INDICES.PINCODE_START + FIELD_LENGTHS.PINCODE,
  STATE_END: REVEAL_DATA_INDICES.STATE_START + FIELD_LENGTHS.STATE,
  PHONE_LAST_4_DIGITS_END:
    REVEAL_DATA_INDICES.PHONE_LAST_4_DIGITS_START + FIELD_LENGTHS.PHONE_LAST_4_DIGITS,
  OFAC_NAME_DOB_CHECK_END:
    REVEAL_DATA_INDICES.OFAC_NAME_DOB_CHECK + FIELD_LENGTHS.OFAC_NAME_DOB_CHECK,
  OFAC_NAME_YOB_CHECK_END:
    REVEAL_DATA_INDICES.OFAC_NAME_YOB_CHECK + FIELD_LENGTHS.OFAC_NAME_YOB_CHECK,
  MINIMUM_AGE_VALID_END: REVEAL_DATA_INDICES.MINIMUM_AGE_VALID + FIELD_LENGTHS.MINIMUM_AGE_VALID,
} as const;

// Range definitions for easy array slicing
export const REVEAL_DATA_RANGES = {
  GENDER: [REVEAL_DATA_INDICES.GENDER, REVEAL_DATA_END_INDICES.GENDER] as const,
  YEAR_OF_BIRTH: [
    REVEAL_DATA_INDICES.YEAR_OF_BIRTH_START,
    REVEAL_DATA_END_INDICES.YEAR_OF_BIRTH_END,
  ] as const,
  MONTH_OF_BIRTH: [
    REVEAL_DATA_INDICES.MONTH_OF_BIRTH_START,
    REVEAL_DATA_END_INDICES.MONTH_OF_BIRTH_END,
  ] as const,
  DAY_OF_BIRTH: [
    REVEAL_DATA_INDICES.DAY_OF_BIRTH_START,
    REVEAL_DATA_END_INDICES.DAY_OF_BIRTH_END,
  ] as const,
  NAME: [REVEAL_DATA_INDICES.NAME_START, REVEAL_DATA_END_INDICES.NAME_END] as const,
  AADHAAR_LAST_4_DIGITS: [
    REVEAL_DATA_INDICES.AADHAAR_LAST_4_DIGITS_START,
    REVEAL_DATA_END_INDICES.AADHAAR_LAST_4_DIGITS_END,
  ] as const,
  PINCODE: [REVEAL_DATA_INDICES.PINCODE_START, REVEAL_DATA_END_INDICES.PINCODE_END] as const,
  STATE: [REVEAL_DATA_INDICES.STATE_START, REVEAL_DATA_END_INDICES.STATE_END] as const,
  PHONE_LAST_4_DIGITS: [
    REVEAL_DATA_INDICES.PHONE_LAST_4_DIGITS_START,
    REVEAL_DATA_END_INDICES.PHONE_LAST_4_DIGITS_END,
  ] as const,
  OFAC_NAME_DOB_CHECK: [
    REVEAL_DATA_INDICES.OFAC_NAME_DOB_CHECK,
    REVEAL_DATA_END_INDICES.OFAC_NAME_DOB_CHECK_END,
  ] as const,
  OFAC_NAME_YOB_CHECK: [
    REVEAL_DATA_INDICES.OFAC_NAME_YOB_CHECK,
    REVEAL_DATA_END_INDICES.OFAC_NAME_YOB_CHECK_END,
  ] as const,
  MINIMUM_AGE_VALID: [
    REVEAL_DATA_INDICES.MINIMUM_AGE_VALID,
    REVEAL_DATA_END_INDICES.MINIMUM_AGE_VALID_END,
  ] as const,
} as const;

// Selector bit positions corresponding to each field (for creating selector bitmap)
export const SELECTOR_BITS = {
  GENDER: [0] as const,
  YEAR_OF_BIRTH: [1, 2, 3, 4] as const,
  MONTH_OF_BIRTH: [5, 6] as const,
  DAY_OF_BIRTH: [7, 8] as const,
  NAME: Array.from({ length: NAME_MAX_LENGTH }, (_, i) => i + 9) as number[], // indices 9-70
  AADHAAR_LAST_4_DIGITS: [71, 72, 73, 74] as const,
  PINCODE: [75, 76, 77, 78, 79, 80] as const,
  STATE: Array.from({ length: MAX_FIELD_BYTE_SIZE }, (_, i) => i + 81) as number[], // indices 81-111
  PHONE_LAST_4_DIGITS: [112, 113, 114, 115] as const,
  PHOTO_HASH: [116] as const, // This uses sel_bits[116] for reveal_photoHash output
  OFAC_NAME_DOB_CHECK: [117] as const, // revealData[116] uses sel_bits[117]
  OFAC_NAME_YOB_CHECK: [118] as const, // revealData[117] uses sel_bits[118]
  // Note: MINIMUM_AGE_VALID has NO selector bit - always revealed (revealData[118])
} as const;

export type AadhaarField = keyof typeof FIELD_LENGTHS;

/**
 * Helper function to extract a specific field from unpacked reveal data
 * @param unpackedData - The unpacked reveal data array (119 elements)
 * @param field - The field to extract
 * @returns The extracted field data as a string or number
 */
export function extractField(unpackedData: string[], field: AadhaarField): string | number {
  const range = REVEAL_DATA_RANGES[field];
  if (range[1] - range[0] === 1) {
    // Single value field
    const value = unpackedData[range[0]];
    // Handle special cases for numeric/boolean fields
    if (
      field === 'OFAC_NAME_DOB_CHECK' ||
      field === 'OFAC_NAME_YOB_CHECK' ||
      field === 'MINIMUM_AGE_VALID'
    ) {
      return value.charCodeAt(0);
    }
    return value;
  } else {
    return unpackedData.slice(range[0], range[1]).join('').replace(/\0+$/, '');
  }
}

/**
 * Helper function to create a selector field for revealing specific data
 * @param fieldsToReveal - Array of field names to reveal
 * @returns Selector value as bigint
 */
export function createSelector(fieldsToReveal: AadhaarField[]): bigint {
  const bits = Array(119).fill(0);

  for (const field of fieldsToReveal) {
    // MINIMUM_AGE_VALID has no selector bit - it's always revealed
    if (field === 'MINIMUM_AGE_VALID') {
      continue;
    }

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

// Commonly used field combinations
export const COMMON_FIELD_COMBINATIONS = {
  BASIC_INFO: ['GENDER', 'YEAR_OF_BIRTH', 'MONTH_OF_BIRTH', 'DAY_OF_BIRTH'] as AadhaarField[],
  IDENTITY: ['NAME', 'YEAR_OF_BIRTH', 'MONTH_OF_BIRTH', 'DAY_OF_BIRTH'] as AadhaarField[],
  LOCATION: ['STATE', 'PINCODE'] as AadhaarField[],
  CONTACT: ['PHONE_LAST_4_DIGITS'] as AadhaarField[],
  OFAC_CHECKS: ['OFAC_NAME_DOB_CHECK', 'OFAC_NAME_YOB_CHECK'] as AadhaarField[],
  // Note: ALL_FIELDS excludes MINIMUM_AGE_VALID since it's always revealed and has no selector bit
  ALL_SELECTABLE_FIELDS: Object.keys(FIELD_LENGTHS).filter(
    (field) => field !== 'MINIMUM_AGE_VALID'
  ) as AadhaarField[],
  ALL_FIELDS: Object.keys(FIELD_LENGTHS) as AadhaarField[],
} as const;
