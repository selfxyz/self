import { discloseIndices, revealedDataIndices } from './constants.js';
import { AttestationId, GenericDiscloseOutput } from 'src/types/types.js';
import { getRevealedDataBytes } from './proof.js';

export const formatRevealedDataPacked = (
  attestationId: AttestationId,
  publicSignals: string[]
): GenericDiscloseOutput => {
  const revealedDataPacked = getRevealedDataBytes(attestationId, publicSignals);
  const revealedDataPackedString = Buffer.from(revealedDataPacked);

  const nullifier = publicSignals[discloseIndices[attestationId].nullifierIndex];
  const forbiddenCountriesListPacked = publicSignals.slice(
    discloseIndices[attestationId].forbiddenCountriesListPackedIndex,
    discloseIndices[attestationId].forbiddenCountriesListPackedIndex + 3
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
  const nationality = revealedDataPackedString
    .subarray(
      revealedDataIndices[attestationId].nationalityStart,
      revealedDataIndices[attestationId].nationalityEnd + 1
    )
    .toString('utf-8');
  const dateOfBirth = revealedDataPackedString
    .subarray(
      revealedDataIndices[attestationId].dateOfBirthStart,
      revealedDataIndices[attestationId].dateOfBirthEnd + 1
    )
    .toString('utf-8');
  const gender = revealedDataPackedString
    .subarray(
      revealedDataIndices[attestationId].genderStart,
      revealedDataIndices[attestationId].genderEnd + 1
    )
    .toString('utf-8');
  const expiryDate = revealedDataPackedString
    .subarray(
      revealedDataIndices[attestationId].expiryDateStart,
      revealedDataIndices[attestationId].expiryDateEnd + 1
    )
    .toString('utf-8');
  const olderThan = Buffer.from(
    revealedDataPackedString.subarray(
      revealedDataIndices[attestationId].olderThanStart,
      revealedDataIndices[attestationId].olderThanEnd + 1
    )
  ).toString('utf-8');
  const ofac = Array.from(
    revealedDataPackedString.subarray(
      revealedDataIndices[attestationId].ofacStart,
      revealedDataIndices[attestationId].ofacEnd + 1
    )
  ).map(Boolean);

  return {
    nullifier: nullifier.toString(),
    forbiddenCountriesListPacked: forbiddenCountriesListPacked,
    issuingState: issuingState,
    name: name,
    idNumber: idNumber,
    nationality: nationality,
    dateOfBirth: dateOfBirth,
    gender: gender,
    expiryDate: expiryDate,
    minimumAge: olderThan,
    ofac: ofac,
  };
};
