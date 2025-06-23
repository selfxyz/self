import { AttestationId } from 'src/types/types.js';

export const discloseIndices = {
  1: {
    revealedDataPackedIndex: 0,
    forbiddenCountriesListPackedIndex: 3,
    nullifierIndex: 7,
    attestationIdIndex: 8,
    merkleRootIndex: 9,
    currentDateIndex: 10,
    namedobSmtRootIndex: 17,
    nameyobSmtRootIndex: 18,
    scopeIndex: 19,
    userIdentifierIndex: 20,
    passportNoSmtRootIndex: 16,
  },
  2: {
    revealedDataPackedIndex: 0,
    forbiddenCountriesListPackedIndex: 4,
    nullifierIndex: 8,
    attestationIdIndex: 9,
    merkleRootIndex: 10,
    currentDateIndex: 11,
    namedobSmtRootIndex: 17,
    nameyobSmtRootIndex: 18,
    scopeIndex: 19,
    userIdentifierIndex: 20,
    passportNoSmtRootIndex: 99,
  },
} as const;

type RevealedDataFields =
  | 'issuingState'
  | 'name'
  | 'idNumber'
  | 'nationality'
  | 'dateOfBirth'
  | 'gender'
  | 'expiryDate'
  | 'olderThan'
  | 'ofac';

export const revealedDataIndices: Record<
  AttestationId,
  Record<`${RevealedDataFields}Start` | `${RevealedDataFields}End`, number>
> = {
  1: {
    issuingStateStart: 2,
    issuingStateEnd: 4,
    nameStart: 5,
    nameEnd: 43,
    idNumberStart: 44,
    idNumberEnd: 52,
    nationalityStart: 54,
    nationalityEnd: 56,
    dateOfBirthStart: 57,
    dateOfBirthEnd: 62,
    genderStart: 64,
    genderEnd: 64,
    expiryDateStart: 65,
    expiryDateEnd: 70,
    olderThanStart: 88,
    olderThanEnd: 89,
    ofacStart: 90,
    ofacEnd: 92,
  },
  2: {
    issuingStateStart: 2,
    issuingStateEnd: 4,
    nameStart: 60,
    nameEnd: 89,
    idNumberStart: 5,
    idNumberEnd: 13,
    nationalityStart: 45,
    nationalityEnd: 47,
    dateOfBirthStart: 30,
    dateOfBirthEnd: 35,
    genderStart: 37,
    genderEnd: 37,
    expiryDateStart: 38,
    expiryDateEnd: 43,
    olderThanStart: 90,
    olderThanEnd: 91,
    ofacStart: 92,
    ofacEnd: 93,
  },
} as const;

const allIdEntries = Object.keys(discloseIndices).map(
  (id) => [Number(id) as AttestationId, true] as [AttestationId, boolean]
);
export const AllIds = new Map<AttestationId, boolean>(allIdEntries);
