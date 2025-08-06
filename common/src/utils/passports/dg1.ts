import { formatDG1Attribute, formatName } from './format.js';
import type { IdDocInput } from './genMockIdDoc.js';

export function genDG1(idDocInput: IdDocInput) {
  switch (idDocInput.idType) {
    case 'mock_passport':
      return genDG1Passport(idDocInput);
    case 'mock_id_card':
      return genDG1IdCard(idDocInput);
  }
}

function genDG1IdCard(idDocInput: IdDocInput) {
  const doc_type_index = [0, 1];
  const issuing_state_index = [2, 4];
  const document_number_index = [5, 13];
  const document_number_check_digit_index = [14, 14];
  const optional_data_index = [15, 29];
  const date_of_birth_index = [30, 35];
  const date_of_birth_check_digit_index = [36, 36];
  const sex_index = [37, 37];
  const expiration_date_index = [38, 43];
  const expiration_date_check_digit_index = [44, 44];
  const nationality_index = [45, 47];
  const optional_data_2_index = [48, 58];
  const overall_check_digit_index = [59, 59];
  const name_index = [60, 89];

  const doc_type = formatDG1Attribute(doc_type_index, 'I');
  const issuing_state = formatDG1Attribute(issuing_state_index, idDocInput.nationality);
  const document_number = formatDG1Attribute(document_number_index, idDocInput.passportNumber);
  const document_number_check_digit = formatDG1Attribute(document_number_check_digit_index, '0');
  const optional_data = formatDG1Attribute(optional_data_index, '');
  const date_of_birth = formatDG1Attribute(date_of_birth_index, idDocInput.birthDate);
  const date_of_birth_check_digit = formatDG1Attribute(date_of_birth_check_digit_index, '0');
  const sex = formatDG1Attribute(sex_index, idDocInput.sex);
  const expiration_date = formatDG1Attribute(expiration_date_index, idDocInput.expiryDate);
  const expiration_date_check_digit = formatDG1Attribute(expiration_date_check_digit_index, '0');
  const nationality = formatDG1Attribute(nationality_index, idDocInput.nationality);
  const optional_data_2 = formatDG1Attribute(optional_data_2_index, '');
  const overall_check_digit = formatDG1Attribute(overall_check_digit_index, '1');
  const name = formatDG1Attribute(
    name_index,
    formatName(idDocInput.firstName, idDocInput.lastName, name_index[1] - name_index[0] + 1)
  );

  const dg1 = `${doc_type}${issuing_state}${document_number}${document_number_check_digit}${optional_data}${date_of_birth}${date_of_birth_check_digit}${sex}${expiration_date}${expiration_date_check_digit}${nationality}${optional_data_2}${overall_check_digit}${name}`;
  if (dg1.length !== 90) {
    throw new Error(`DG1 length is not 90: ${dg1.length}`);
  }
  return dg1;
}

function genDG1Passport(idDocInput: IdDocInput) {
  const doc_type_index = [0, 1];
  const issuing_state_index = [2, 4];
  const name_index = [5, 43];
  const document_number_index = [44, 52];
  const document_number_check_digit_index = [53, 53];
  const nationality_index = [54, 56];
  const date_of_birth_index = [57, 62];
  const date_of_birth_check_digit_index = [63, 63];
  const sex_index = [64, 64];
  const expiration_date_index = [65, 70];
  const expiration_date_check_digit_index = [71, 71];
  const optional_data_index = [72, 85];
  const optional_data_check_digit_index = [86, 86];
  const overall_check_digit_index = [87, 87];

  const doc_type = formatDG1Attribute(doc_type_index, 'P');
  const issuing_state = formatDG1Attribute(issuing_state_index, idDocInput.nationality);
  const name = formatDG1Attribute(
    name_index,
    formatName(idDocInput.firstName, idDocInput.lastName, name_index[1] - name_index[0] + 1)
  );
  const document_number = formatDG1Attribute(document_number_index, idDocInput.passportNumber);
  const document_number_check_digit = formatDG1Attribute(document_number_check_digit_index, '4');
  const nationality = formatDG1Attribute(nationality_index, idDocInput.nationality);
  const date_of_birth = formatDG1Attribute(date_of_birth_index, idDocInput.birthDate);
  const date_of_birth_check_digit = formatDG1Attribute(date_of_birth_check_digit_index, '1');
  const sex = formatDG1Attribute(sex_index, idDocInput.sex);
  const expiration_date = formatDG1Attribute(expiration_date_index, idDocInput.expiryDate);
  const expiration_date_check_digit = formatDG1Attribute(expiration_date_check_digit_index, '5');
  const optional_data = formatDG1Attribute(optional_data_index, '');
  const optional_data_check_digit = formatDG1Attribute(optional_data_check_digit_index, '<');
  const overall_check_digit = formatDG1Attribute(overall_check_digit_index, '2');

  const dg1 = `${doc_type}${issuing_state}${name}${document_number}${document_number_check_digit}${nationality}${date_of_birth}${date_of_birth_check_digit}${sex}${expiration_date}${expiration_date_check_digit}${optional_data}${optional_data_check_digit}${overall_check_digit}`;
  if (dg1.length !== 88) {
    throw new Error(`DG1 length is not 88: ${dg1.length}`);
  }
  return dg1;
}
