export const KYC_COUNTRY_INDEX = 0;
export const KYC_COUNTRY_LENGTH = 3;

export const KYC_ID_TYPE_INDEX = KYC_COUNTRY_INDEX + KYC_COUNTRY_LENGTH;
export const KYC_ID_TYPE_LENGTH = 27;

export const KYC_ID_NUMBER_INDEX = KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH;
export const KYC_ID_NUMBER_LENGTH = 32;

export const KYC_ISSUANCE_DATE_INDEX = KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH;
export const KYC_ISSUANCE_DATE_LENGTH = 8;

export const KYC_EXPIRY_DATE_INDEX = KYC_ISSUANCE_DATE_INDEX + KYC_ISSUANCE_DATE_LENGTH;
export const KYC_EXPIRY_DATE_LENGTH = 8;

export const KYC_FULL_NAME_INDEX = KYC_EXPIRY_DATE_INDEX + KYC_EXPIRY_DATE_LENGTH;
export const KYC_FULL_NAME_LENGTH = 64; // Updated: max(40, 64) = 64

export const KYC_DOB_INDEX = KYC_FULL_NAME_INDEX + KYC_FULL_NAME_LENGTH;
export const KYC_DOB_LENGTH = 8;

export const KYC_PHOTO_HASH_INDEX = KYC_DOB_INDEX + KYC_DOB_LENGTH;
export const KYC_PHOTO_HASH_LENGTH = 32;

export const KYC_PHONE_NUMBER_INDEX = KYC_PHOTO_HASH_INDEX + KYC_PHOTO_HASH_LENGTH;
export const KYC_PHONE_NUMBER_LENGTH = 12;

export const KYC_GENDER_INDEX = KYC_PHONE_NUMBER_INDEX + KYC_PHONE_NUMBER_LENGTH;
export const KYC_GENDER_LENGTH = 1;

export const KYC_ADDRESS_INDEX = KYC_GENDER_INDEX + KYC_GENDER_LENGTH;
export const KYC_ADDRESS_LENGTH = 100;

export const KYC_MAX_LENGTH = KYC_ADDRESS_INDEX + KYC_ADDRESS_LENGTH;

// ------------------------------
// Field lengths for selector bits
// ------------------------------
export const KYC_FIELD_LENGTHS = {
  COUNTRY: KYC_COUNTRY_LENGTH, // 3
  ID_TYPE: KYC_ID_TYPE_LENGTH, // 27
  ID_NUMBER: KYC_ID_NUMBER_LENGTH, // 32 (updated)
  ISSUANCE_DATE: KYC_ISSUANCE_DATE_LENGTH, // 8
  EXPIRY_DATE: KYC_EXPIRY_DATE_LENGTH, // 8
  FULL_NAME: KYC_FULL_NAME_LENGTH, // 64 (updated)
  DOB: KYC_DOB_LENGTH, // 8
  PHOTO_HASH: KYC_PHOTO_HASH_LENGTH, // 32
  PHONE_NUMBER: KYC_PHONE_NUMBER_LENGTH, // 12
  GENDER: KYC_GENDER_LENGTH, // 1
  ADDRESS: KYC_ADDRESS_LENGTH, // 100
} as const;

// ------------------------------
// Reveal data indices for selector bits
// ------------------------------
export const KYC_REVEAL_DATA_INDICES = {
  COUNTRY: 0,
  ID_TYPE: KYC_COUNTRY_LENGTH, // 3
  ID_NUMBER: KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH, // 30
  ISSUANCE_DATE: KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH, // 62 (updated)
  EXPIRY_DATE: KYC_ISSUANCE_DATE_INDEX + KYC_ISSUANCE_DATE_LENGTH, // 70 (updated)
  FULL_NAME: KYC_EXPIRY_DATE_INDEX + KYC_EXPIRY_DATE_LENGTH, // 78 (updated)
  DOB: KYC_FULL_NAME_INDEX + KYC_FULL_NAME_LENGTH, // 142 (updated)
  PHOTO_HASH: KYC_DOB_INDEX + KYC_DOB_LENGTH, // 150 (updated)
  PHONE_NUMBER: KYC_PHOTO_HASH_INDEX + KYC_PHOTO_HASH_LENGTH, // 182 (updated)
  GENDER: KYC_PHONE_NUMBER_INDEX + KYC_PHONE_NUMBER_LENGTH, // 194 (updated)
  ADDRESS: KYC_GENDER_INDEX + KYC_GENDER_LENGTH, // 232 (updated)
} as const;

// ------------------------------
// Selector bit positions for each field
// ------------------------------
export const KYC_SELECTOR_BITS = {
  COUNTRY: Array.from({ length: KYC_COUNTRY_LENGTH }, (_, i) => i) as number[], // 0-2
  ID_TYPE: Array.from({ length: KYC_ID_TYPE_LENGTH }, (_, i) => i + KYC_COUNTRY_LENGTH) as number[], // 3-29
  ID_NUMBER: Array.from(
    { length: KYC_ID_NUMBER_LENGTH },
    (_, i) => i + KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH
  ) as number[], // 30-61 (updated)
  ISSUANCE_DATE: Array.from(
    { length: KYC_ISSUANCE_DATE_LENGTH },
    (_, i) => i + KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH
  ) as number[], // 62-69 (updated)
  EXPIRY_DATE: Array.from(
    { length: KYC_EXPIRY_DATE_LENGTH },
    (_, i) => i + KYC_ISSUANCE_DATE_INDEX + KYC_ISSUANCE_DATE_LENGTH
  ) as number[], // 70-77 (updated)
  FULL_NAME: Array.from(
    { length: KYC_FULL_NAME_LENGTH },
    (_, i) => i + KYC_EXPIRY_DATE_INDEX + KYC_EXPIRY_DATE_LENGTH
  ) as number[], // 78-141 (updated)
  DOB: Array.from(
    { length: KYC_DOB_LENGTH },
    (_, i) => i + KYC_FULL_NAME_INDEX + KYC_FULL_NAME_LENGTH
  ) as number[], // 142-149 (updated)
  PHOTO_HASH: Array.from(
    { length: KYC_PHOTO_HASH_LENGTH },
    (_, i) => i + KYC_DOB_INDEX + KYC_DOB_LENGTH
  ) as number[], // 150-181 (updated)
  PHONE_NUMBER: Array.from(
    { length: KYC_PHONE_NUMBER_LENGTH },
    (_, i) => i + KYC_PHOTO_HASH_INDEX + KYC_PHOTO_HASH_LENGTH
  ) as number[], // 182-193 (updated)
  GENDER: Array.from(
    { length: KYC_GENDER_LENGTH },
    (_, i) => i + KYC_PHONE_NUMBER_INDEX + KYC_PHONE_NUMBER_LENGTH
  ) as number[], // 194-194 (updated)
  ADDRESS: Array.from(
    { length: KYC_ADDRESS_LENGTH },
    (_, i) => i + KYC_GENDER_INDEX + KYC_GENDER_LENGTH
  ) as number[], // 232-331 (updated)
} as const;

export type KycField = keyof typeof KYC_FIELD_LENGTHS;

// ------------------------------
// Public Signals Indices
// ------------------------------

export const KYC_PUBLIC_SIGNALS_ATTESTATION_ID = 0;

export const KYC_PUBLIC_SIGNALS_REVEALED_DATA_PACKED = 1;
export const KYC_PUBLIC_SIGNALS_REVEALED_DATA_PACKED_LENGTH = 9;

export const KYC_PUBLIC_SIGNALS_FORBIDDEN_COUNTRIES_PACKED = 10;
export const KYC_PUBLIC_SIGNALS_FORBIDDEN_COUNTRIES_PACKED_LENGTH = 4;

export const KYC_PUBLIC_SIGNALS_NULLIFIER = 14;

export const KYC_PUBLIC_SIGNALS_SCOPE = 15;
export const KYC_PUBLIC_SIGNALS_USER_IDENTIFIER = 16;

export const KYC_PUBLIC_SIGNALS_CURRENT_DATE = 17;
export const KYC_PUBLIC_SIGNALS_CURRENT_DATE_LENGTH = 8;

export const KYC_PUBLIC_SIGNALS_OFAC_NAME_DOB_SMT_ROOT = 25;
export const KYC_PUBLIC_SIGNALS_OFAC_NAME_YOB_SMT_ROOT = 26;

// ------------------------------
// Helper functions for selector bits
// ------------------------------

export function createKycSelector(fieldsToReveal: KycField[]): [bigint, bigint] {
  const bits = Array(KYC_MAX_LENGTH).fill(0);

  for (const field of fieldsToReveal) {
    const selectorBits = KYC_SELECTOR_BITS[field];
    for (const bit of selectorBits) {
      bits[bit] = 1;
    }
  }

  let lowResult = 0n;
  let highResult = 0n;

  const splitPoint = Math.floor(KYC_MAX_LENGTH / 2);

  for (let i = 0; i < splitPoint; i++) {
    if (bits[i]) {
      lowResult += 1n << BigInt(i);
    }
  }
  for (let i = splitPoint; i < KYC_MAX_LENGTH; i++) {
    if (bits[i]) {
      highResult += 1n << BigInt(i - splitPoint);
    }
  }

  return [lowResult, highResult];
}
