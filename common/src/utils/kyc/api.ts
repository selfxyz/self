// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import {
  KYC_ADDRESS_INDEX,
  KYC_ADDRESS_LENGTH,
  KYC_COUNTRY_INDEX,
  KYC_COUNTRY_LENGTH,
  KYC_DOB_INDEX,
  KYC_DOB_LENGTH,
  KYC_EXPIRY_DATE_INDEX,
  KYC_EXPIRY_DATE_LENGTH,
  KYC_FULL_NAME_INDEX,
  KYC_FULL_NAME_LENGTH,
  KYC_GENDER_INDEX,
  KYC_GENDER_LENGTH,
  KYC_ID_NUMBER_INDEX,
  KYC_ID_NUMBER_LENGTH,
  KYC_ID_TYPE_INDEX,
  KYC_ID_TYPE_LENGTH,
  KYC_ISSUANCE_DATE_INDEX,
  KYC_ISSUANCE_DATE_LENGTH,
  KYC_PHONE_NUMBER_INDEX,
  KYC_PHONE_NUMBER_LENGTH,
  KYC_PHOTO_HASH_INDEX,
  KYC_PHOTO_HASH_LENGTH,
} from './constants.js';
import { KycData } from './types.js';

import { Point } from '@zk-kit/baby-jubjub';


//accepts a base64 applicant info and returns a kyc data object
export function deserializeApplicantInfo(
  applicantInfoBase64: string
): Omit<
  KycData,
  'user_identifier' | 'current_date' | 'majority_age_ASCII' | 'selector_older_than'
> {
  const applicantInfo = Buffer.from(applicantInfoBase64, 'base64').toString('utf-8');
  const country = applicantInfo
    .slice(KYC_COUNTRY_INDEX, KYC_COUNTRY_INDEX + KYC_COUNTRY_LENGTH)
    .replace(/\x00/g, '');
  const idType = applicantInfo
    .slice(KYC_ID_TYPE_INDEX, KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH)
    .replace(/\x00/g, '');
  const idNumber = applicantInfo
    .slice(KYC_ID_NUMBER_INDEX, KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH)
    .replace(/\x00/g, '');
  const issuanceDate = applicantInfo
    .slice(KYC_ISSUANCE_DATE_INDEX, KYC_ISSUANCE_DATE_INDEX + KYC_ISSUANCE_DATE_LENGTH)
    .replace(/\x00/g, '');
  const expiryDate = applicantInfo
    .slice(KYC_EXPIRY_DATE_INDEX, KYC_EXPIRY_DATE_INDEX + KYC_EXPIRY_DATE_LENGTH)
    .replace(/\x00/g, '');
  const fullName = applicantInfo
    .slice(KYC_FULL_NAME_INDEX, KYC_FULL_NAME_INDEX + KYC_FULL_NAME_LENGTH)
    .replace(/\x00/g, '');
  const dob = applicantInfo
    .slice(KYC_DOB_INDEX, KYC_DOB_INDEX + KYC_DOB_LENGTH)
    .replace(/\x00/g, '');
  const photoHash = applicantInfo
    .slice(KYC_PHOTO_HASH_INDEX, KYC_PHOTO_HASH_INDEX + KYC_PHOTO_HASH_LENGTH)
    .replace(/\x00/g, '');
  const phoneNumber = applicantInfo
    .slice(KYC_PHONE_NUMBER_INDEX, KYC_PHONE_NUMBER_INDEX + KYC_PHONE_NUMBER_LENGTH)
    .replace(/\x00/g, '');
  const gender = applicantInfo
    .slice(KYC_GENDER_INDEX, KYC_GENDER_INDEX + KYC_GENDER_LENGTH)
    .replace(/\x00/g, '');
  const address = applicantInfo
    .slice(KYC_ADDRESS_INDEX, KYC_ADDRESS_INDEX + KYC_ADDRESS_LENGTH)
    .replace(/\x00/g, '');

  return {
    country,
    idType,
    idNumber,
    issuanceDate,
    expiryDate,
    fullName,
    dob,
    photoHash,
    phoneNumber,
    gender,
    address,
  };
}


//accepts a base64 signature and returns a signature object
export function deserializeSignature(signature: string): { R: Point<bigint>; s: bigint } {
  const [Rx, Ry, s] = Buffer.from(signature, 'base64').toString('utf-8').split(',').map(BigInt);
  return { R: [Rx, Ry] as Point<bigint>, s };
}
