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
export const KYC_FULL_NAME_LENGTH = 64;

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

export const KYC_FIELD_LENGTHS = {
  COUNTRY: KYC_COUNTRY_LENGTH,
  ID_TYPE: KYC_ID_TYPE_LENGTH,
  ID_NUMBER: KYC_ID_NUMBER_LENGTH,
  ISSUANCE_DATE: KYC_ISSUANCE_DATE_LENGTH,
  EXPIRY_DATE: KYC_EXPIRY_DATE_LENGTH,
  FULL_NAME: KYC_FULL_NAME_LENGTH,
  DOB: KYC_DOB_LENGTH,
  PHOTO_HASH: KYC_PHOTO_HASH_LENGTH,
  PHONE_NUMBER: KYC_PHONE_NUMBER_LENGTH,
  GENDER: KYC_GENDER_LENGTH,
  ADDRESS: KYC_ADDRESS_LENGTH,
} as const;

export const KYC_REVEAL_DATA_INDICES = {
  COUNTRY: KYC_COUNTRY_INDEX,
  ID_TYPE: KYC_ID_TYPE_INDEX,
  ID_NUMBER: KYC_ID_NUMBER_INDEX,
  ISSUANCE_DATE: KYC_ISSUANCE_DATE_INDEX,
  EXPIRY_DATE: KYC_EXPIRY_DATE_INDEX,
  FULL_NAME: KYC_FULL_NAME_INDEX,
  DOB: KYC_DOB_INDEX,
  PHOTO_HASH: KYC_PHOTO_HASH_INDEX,
  PHONE_NUMBER: KYC_PHONE_NUMBER_INDEX,
  GENDER: KYC_GENDER_INDEX,
  ADDRESS: KYC_ADDRESS_INDEX,
} as const;

export const KYC_SELECTOR_BITS = {
  COUNTRY: Array.from({ length: KYC_COUNTRY_LENGTH }, (_, i) => KYC_COUNTRY_INDEX + i) as number[],
  ID_TYPE: Array.from({ length: KYC_ID_TYPE_LENGTH }, (_, i) => KYC_ID_TYPE_INDEX + i) as number[],
  ID_NUMBER: Array.from(
    { length: KYC_ID_NUMBER_LENGTH },
    (_, i) => KYC_ID_NUMBER_INDEX + i,
  ) as number[],
  ISSUANCE_DATE: Array.from(
    { length: KYC_ISSUANCE_DATE_LENGTH },
    (_, i) => KYC_ISSUANCE_DATE_INDEX + i,
  ) as number[],
  EXPIRY_DATE: Array.from(
    { length: KYC_EXPIRY_DATE_LENGTH },
    (_, i) => KYC_EXPIRY_DATE_INDEX + i,
  ) as number[],
  FULL_NAME: Array.from(
    { length: KYC_FULL_NAME_LENGTH },
    (_, i) => KYC_FULL_NAME_INDEX + i,
  ) as number[],
  DOB: Array.from({ length: KYC_DOB_LENGTH }, (_, i) => KYC_DOB_INDEX + i) as number[],
  PHOTO_HASH: Array.from(
    { length: KYC_PHOTO_HASH_LENGTH },
    (_, i) => KYC_PHOTO_HASH_INDEX + i,
  ) as number[],
  PHONE_NUMBER: Array.from(
    { length: KYC_PHONE_NUMBER_LENGTH },
    (_, i) => KYC_PHONE_NUMBER_INDEX + i,
  ) as number[],
  GENDER: Array.from({ length: KYC_GENDER_LENGTH }, (_, i) => KYC_GENDER_INDEX + i) as number[],
  ADDRESS: Array.from({ length: KYC_ADDRESS_LENGTH }, (_, i) => KYC_ADDRESS_INDEX + i) as number[],
} as const;

export type KycField = keyof typeof KYC_FIELD_LENGTHS;

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
