// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import type { AadhaarData, IdDocInput, PassportData } from '@selfxyz/common';
import { generateMockDSC, genMockIdDoc, getSKIPEM, initPassportDataParsing } from '@selfxyz/common';

export interface GenerateMockDocumentOptions {
  age: number;
  expiryYears: number;
  isInOfacList: boolean;
  selectedAlgorithm: string;
  selectedCountry: string;
  selectedDocumentType: 'mock_passport' | 'mock_id_card' | 'mock_aadhaar';
  firstName?: string;
  lastName?: string;
}

const formatDateToYYMMDD = (date: Date): string => {
  return (date.toISOString().slice(2, 4) + date.toISOString().slice(5, 7) + date.toISOString().slice(8, 10)).toString();
};

// for aadhar
const formatDateToDDMMYYYY = (date: Date): string => {
  return (
    date.toISOString().slice(8, 10) +
    '-' +
    date.toISOString().slice(5, 7) +
    '-' +
    date.toISOString().slice(0, 4)
  ).toString();
};

const getBirthDateFromAge = (age: number, format: 'YYMMDD' | 'DDMMYYYY' = 'YYMMDD'): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  return format === 'YYMMDD' ? formatDateToYYMMDD(date) : formatDateToDDMMYYYY(date);
};

const getExpiryDateFromYears = (years: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return formatDateToYYMMDD(date);
};

export async function generateMockDocument({
  age,
  expiryYears,
  isInOfacList,
  selectedAlgorithm,
  selectedCountry,
  selectedDocumentType,
  firstName,
  lastName,
}: GenerateMockDocumentOptions): Promise<PassportData | AadhaarData> {
  console.log('generateMockDocument received names:', { firstName, lastName, isInOfacList });
  const randomPassportNumber = Math.random()
    .toString(36)
    .substring(2, 11)
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();
  const [dgHashAlgo, eContentHashAlgo, signatureTypeForGeneration] =
    signatureAlgorithmToStrictSignatureAlgorithm[
      selectedAlgorithm as keyof typeof signatureAlgorithmToStrictSignatureAlgorithm
    ];

  const idDocInput: Partial<IdDocInput> = {
    nationality: selectedCountry as IdDocInput['nationality'],
    idType: selectedDocumentType as IdDocInput['idType'],
    dgHashAlgo: dgHashAlgo as IdDocInput['dgHashAlgo'],
    eContentHashAlgo: eContentHashAlgo as IdDocInput['eContentHashAlgo'],
    signatureType: signatureTypeForGeneration as IdDocInput['signatureType'],
    expiryDate: getExpiryDateFromYears(expiryYears),
    passportNumber: randomPassportNumber,
    sex: 'M', // Default value
  };

  if (selectedDocumentType === 'mock_aadhaar') {
    idDocInput.birthDate = getBirthDateFromAge(age, 'DDMMYYYY');

    if (isInOfacList) {
      idDocInput.lastName = lastName || 'HENAO MONTOYA';
      idDocInput.firstName = firstName || 'ARCANGEL DE JESUS';
      idDocInput.birthDate = '07-10-1954';
    } else {
      if (firstName) idDocInput.firstName = firstName;
      if (lastName) idDocInput.lastName = lastName;
    }

    const result = genMockIdDoc(idDocInput);
    if ('qrData' in result) {
      console.log('Generated Aadhaar qrData:', result.qrData);
      console.log('Generated Aadhaar extractedFields:', result.extractedFields);
    }
    return result;
  }

  let dobForGeneration: string;
  if (isInOfacList) {
    dobForGeneration = '541007';
    idDocInput.lastName = lastName || 'HENAO MONTOYA';
    idDocInput.firstName = firstName || 'ARCANGEL DE JESUS';
  } else {
    dobForGeneration = getBirthDateFromAge(age);
    if (firstName) idDocInput.firstName = firstName;
    if (lastName) idDocInput.lastName = lastName;
  }
  idDocInput.birthDate = dobForGeneration;

  let mockDSC, rawMockData;
  try {
    mockDSC = await generateMockDSC(idDocInput.signatureType || 'rsa_sha256_65537_2048');
    rawMockData = genMockIdDoc(idDocInput, mockDSC);
  } catch (error) {
    console.warn('Falling back to default mock DSC. Error during mock DSC generation:', error);
    rawMockData = genMockIdDoc(idDocInput);
  }
  const skiPem = await getSKIPEM('staging');
  return initPassportDataParsing(rawMockData as PassportData, skiPem);
}

export const signatureAlgorithmToStrictSignatureAlgorithm = {
  'sha256 rsa 65537 4096': ['sha256', 'sha256', 'rsa_sha256_65537_4096'],
  'sha1 rsa 65537 2048': ['sha1', 'sha1', 'rsa_sha1_65537_2048'],
  'sha256 brainpoolP256r1': ['sha256', 'sha256', 'ecdsa_sha256_brainpoolP256r1_256'],
  'sha384 brainpoolP384r1': ['sha384', 'sha384', 'ecdsa_sha384_brainpoolP384r1_384'],
  'sha384 secp384r1': ['sha384', 'sha384', 'ecdsa_sha384_secp384r1_384'],
  'sha256 rsa 65537 2048': ['sha256', 'sha256', 'rsa_sha256_65537_2048'],
  'sha256 rsa 3 2048': ['sha256', 'sha256', 'rsa_sha256_3_2048'],
  'sha256 rsa 65537 3072': ['sha256', 'sha256', 'rsa_sha256_65537_3072'],
  'sha256 rsa 3 4096': ['sha256', 'sha256', 'rsa_sha256_3_4096'],
  'sha384 rsa 65537 4096': ['sha384', 'sha384', 'rsa_sha384_65537_4096'],
  'sha512 rsa 65537 2048': ['sha512', 'sha512', 'rsa_sha512_65537_2048'],
  'sha512 rsa 65537 4096': ['sha512', 'sha512', 'rsa_sha512_65537_4096'],
  'sha1 rsa 65537 4096': ['sha1', 'sha1', 'rsa_sha1_65537_4096'],
  'sha256 rsapss 3 2048': ['sha256', 'sha256', 'rsapss_sha256_3_2048'],
  'sha256 rsapss 3 3072': ['sha256', 'sha256', 'rsapss_sha256_3_3072'],
  'sha256 rsapss 65537 3072': ['sha256', 'sha256', 'rsapss_sha256_65537_3072'],
  'sha256 rsapss 65537 4096': ['sha256', 'sha256', 'rsapss_sha256_65537_4096'],
  'sha384 rsapss 65537 2048': ['sha384', 'sha384', 'rsapss_sha384_65537_2048'],
  'sha384 rsapss 65537 3072': ['sha384', 'sha384', 'rsapss_sha384_65537_3072'],
  'sha512 rsapss 65537 2048': ['sha512', 'sha512', 'rsapss_sha512_65537_2048'],
  'sha512 rsapss 65537 4096': ['sha512', 'sha512', 'rsapss_sha512_65537_4096'],
  'sha1 secp256r1': ['sha1', 'sha1', 'ecdsa_sha1_secp256r1_256'],
  'sha224 secp224r1': ['sha224', 'sha224', 'ecdsa_sha224_secp224r1_224'],
  'sha256 secp256r1': ['sha256', 'sha256', 'ecdsa_sha256_secp256r1_256'],
  'sha256 secp384r1': ['sha256', 'sha256', 'ecdsa_sha256_secp384r1_384'],
  'sha1 brainpoolP224r1': ['sha1', 'sha1', 'ecdsa_sha1_brainpoolP224r1_224'],
  'sha1 brainpoolP256r1': ['sha1', 'sha1', 'ecdsa_sha1_brainpoolP256r1_256'],
  'sha224 brainpoolP224r1': ['sha224', 'sha224', 'ecdsa_sha224_brainpoolP224r1_224'],
  'sha256 brainpoolP224r1': ['sha256', 'sha256', 'ecdsa_sha256_brainpoolP224r1_224'],
  'sha384 brainpoolP256r1': ['sha384', 'sha384', 'ecdsa_sha384_brainpoolP256r1_256'],
  'sha512 brainpoolP256r1': ['sha512', 'sha512', 'ecdsa_sha512_brainpoolP256r1_256'],
  'sha512 brainpoolP384r1': ['sha512', 'sha512', 'ecdsa_sha512_brainpoolP384r1_384'],
  'sha512 poland': ['sha512', 'sha512', 'rsa_sha256_65537_4096'],
  'not existing': ['sha512', 'sha384', 'rsa_sha256_65537_4096'],
} as const;
