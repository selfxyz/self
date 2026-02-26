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
