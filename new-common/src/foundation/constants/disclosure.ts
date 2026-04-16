export const attributeToPosition = {
  issuing_state: [2, 4],
  name: [5, 43],
  passport_number: [44, 52],
  nationality: [54, 56],
  date_of_birth: [57, 62],
  gender: [64, 64],
  expiry_date: [65, 70],
  older_than: [88, 89],
  ofac: [90, 90],
};

export const attributeToPosition_ID = {
  issuing_state: [2, 4],
  name: [60, 89],
  passport_number: [5, 13],
  nationality: [45, 47],
  date_of_birth: [30, 35],
  gender: [37, 37],
  expiry_date: [38, 43],
  older_than: [90, 91],
  ofac: [92, 92],
};

export const revealedDataTypes = {
  issuing_state: 0,
  name: 1,
  passport_number: 2,
  nationality: 3,
  date_of_birth: 4,
  gender: 5,
  expiry_date: 6,
  older_than: 7,
  passport_no_ofac: 8,
  name_and_dob_ofac: 9,
  name_and_yob_ofac: 10,
};

/**
 * Must match in both backend and frontend SDK.
 * Any mismatch will result in an INVALID_FORBIDDEN_COUNTRIES error.
 */
export const MAX_FORBIDDEN_COUNTRIES_LIST_LENGTH = 40;

export const DEFAULT_USER_ID_TYPE = 'uuid';

import type { DisclosureField } from '../../documents/interface.js';

const DISCLOSURE_TO_PASSPORT_ATTR: Record<DisclosureField, (keyof typeof attributeToPosition)[]> = {
  name: ['name'],
  gender: ['gender'],
  date_of_birth: ['date_of_birth'],
  nationality: ['nationality'],
  id_number: ['passport_number'],
  issuing_state: ['issuing_state'],
  expiry_date: ['expiry_date'],
  ofac: [],
  older_than: [],
};

export interface PassportDisclosureSelector {
  selectorDg1: string[];
  selectorOlderThan: number;
  selectorOfac: number;
}

export function disclosureToPassportSelectors(
  fields: DisclosureField[],
  idType: 'passport' | 'id',
): PassportDisclosureSelector {
  const attToPos = idType === 'passport' ? attributeToPosition : attributeToPosition_ID;
  const bitmapLen = idType === 'passport' ? 88 : 90;
  const selectorDg1 = Array(bitmapLen).fill('0');

  for (const field of fields) {
    const attrs = DISCLOSURE_TO_PASSPORT_ATTR[field];
    for (const attr of attrs) {
      const [start, end] = attToPos[attr as keyof typeof attToPos];
      selectorDg1.fill('1', start, end + 1);
    }
  }

  return {
    selectorDg1,
    selectorOlderThan: fields.includes('older_than') ? 1 : 0,
    selectorOfac: fields.includes('ofac') ? 1 : 0,
  };
}
