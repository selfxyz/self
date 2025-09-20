import { discloseIndices, revealedDataIndices } from './constants.js';
import { AttestationId, GenericDiscloseOutput } from 'src/types/types.js';
import { getRevealedDataBytes } from './proof.js';

/**
 * Removes null bytes (\x00) from a string
 * @param str - The string to clean
 * @returns The string with null bytes removed
 */
export const removeNullBytes = (str: string): string => {
  return str.replace(/\x00/g, '');
};

export const formatRevealedDataPacked = (
  attestationId: AttestationId,
  publicSignals: string[]
): GenericDiscloseOutput => {
  const revealedDataPacked = getRevealedDataBytes(attestationId, publicSignals);
  const revealedDataPackedString = Buffer.from(revealedDataPacked);

  const nullifier = publicSignals[discloseIndices[attestationId].nullifierIndex];
  const forbiddenCountriesListPacked = publicSignals.slice(
    discloseIndices[attestationId].forbiddenCountriesListPackedIndex,
    discloseIndices[attestationId].forbiddenCountriesListPackedIndex + 4
  );
  const issuingState = revealedDataPackedString
    .subarray(
      revealedDataIndices[attestationId].issuingStateStart,
      revealedDataIndices[attestationId].issuingStateEnd + 1
    )
    .toString('utf-8');
  const name = revealedDataPackedString
    .subarray(
      revealedDataIndices[attestationId].nameStart,
      revealedDataIndices[attestationId].nameEnd + 1
    )
    .toString('utf-8')
    .replace(/([A-Z])<+([A-Z])/g, '$1 $2')
    .replace(/</g, '')
    .trim();
  const idNumber = revealedDataPackedString
    .subarray(
      revealedDataIndices[attestationId].idNumberStart,
      revealedDataIndices[attestationId].idNumberEnd + 1
    )
    .toString('utf-8');

  let nationality: string;
  if (attestationId === 3) {
    nationality = 'IND';
  } else {
    nationality = revealedDataPackedString
      .subarray(
        revealedDataIndices[attestationId].nationalityStart,
        revealedDataIndices[attestationId].nationalityEnd + 1
      )
      .toString('utf-8');
  }
  let dateOfBirth: string;
  if (attestationId === 3) {
    dateOfBirth = new Array(
      revealedDataPackedString.subarray(
        revealedDataIndices[attestationId].dateOfBirthStart,
        revealedDataIndices[attestationId].dateOfBirthEnd + 1
      )
    )
      .map(Number)
      .map(String)
      .join('');
  } else {
    dateOfBirth = revealedDataPackedString
      .subarray(
        revealedDataIndices[attestationId].dateOfBirthStart,
        revealedDataIndices[attestationId].dateOfBirthEnd + 1
      )
      .toString('utf-8');
  }
  const gender = revealedDataPackedString
    .subarray(
      revealedDataIndices[attestationId].genderStart,
      revealedDataIndices[attestationId].genderEnd + 1
    )
    .toString('utf-8');
  let expiryDate: string;
  if (attestationId === 3) {
    expiryDate = 'UNAVAILABLE';
  } else {
    expiryDate = revealedDataPackedString
      .subarray(
        revealedDataIndices[attestationId].expiryDateStart,
        revealedDataIndices[attestationId].expiryDateEnd + 1
      )
      .toString('utf-8');
  }
  let olderThan: string;
  if (attestationId === 3) {
    olderThan = revealedDataPackedString
      .subarray(
        revealedDataIndices[attestationId].olderThanStart,
        revealedDataIndices[attestationId].olderThanEnd + 1
      )[0]
      .toString()
      .padStart(2, '0');
  } else {
    olderThan = revealedDataPackedString
      .subarray(
        revealedDataIndices[attestationId].olderThanStart,
        revealedDataIndices[attestationId].olderThanEnd + 1
      )
      .toString('utf-8');
  }
  const ofac = Array.from(
    revealedDataPackedString.subarray(
      revealedDataIndices[attestationId].ofacStart,
      revealedDataIndices[attestationId].ofacEnd + 1
    )
  )
    .map(Boolean)
    .map((x) => !x);

  if (ofac.length < 3) {
    ofac.unshift(false);
  }

  return {
    nullifier: nullifier.toString(),
    forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    issuingState: removeNullBytes(issuingState),
    name: removeNullBytes(name),
    idNumber: idNumber,
    nationality: nationality,
    dateOfBirth: dateOfBirth,
    gender: gender,
    expiryDate: expiryDate,
    minimumAge: olderThan,
    ofac: ofac,
  };
};
