import { Point } from '@zk-kit/baby-jubjub';
import * as constants from './constants.js';

export type KycData = {
  country: string;
  idType: string;
  idNumber: string;
  issuanceDate: string;
  expiryDate: string;
  fullName: string;
  dob: string;
  photoHash: string;
  phoneNumber: string;
  document: string;
  gender: string;
  address: string;
  user_identifier: string;
  current_date: string;
  majority_age_ASCII: string;
  selector_older_than: string;
};

export const serializeKycData = (kycData: KycData) => {
  //ensure max length of each field
  let serializedData = '';
  serializedData += kycData.country.toUpperCase().padEnd(constants.KYC_COUNTRY_LENGTH, '\0');
  serializedData += kycData.idType.toUpperCase().padEnd(constants.KYC_ID_TYPE_LENGTH, '\0');
  serializedData += kycData.idNumber.padEnd(constants.KYC_ID_NUMBER_LENGTH, '\0');
  serializedData += kycData.issuanceDate.padEnd(constants.KYC_ISSUANCE_DATE_LENGTH, '\0');
  serializedData += kycData.expiryDate.padEnd(constants.KYC_EXPIRY_DATE_LENGTH, '\0');
  serializedData += kycData.fullName.padEnd(constants.KYC_FULL_NAME_LENGTH, '\0');
  serializedData += kycData.dob.padEnd(constants.KYC_DOB_LENGTH, '\0');
  serializedData += kycData.photoHash.padEnd(constants.KYC_PHOTO_HASH_LENGTH, '\0');
  serializedData += kycData.phoneNumber.padEnd(constants.KYC_PHONE_NUMBER_LENGTH, '\0');
  serializedData += kycData.document.padEnd(constants.KYC_DOCUMENT_LENGTH, '\0');
  serializedData += kycData.gender.padEnd(constants.KYC_GENDER_LENGTH, '\0');
  serializedData += kycData.address.padEnd(constants.KYC_ADDRESS_LENGTH, '\0');

  return serializedData;
};

export type KycRegisterInput = {
  data_padded: number[];
  s: bigint;
  R: [bigint, bigint];
  pubKey: [bigint, bigint];
  secret: string;
};

export type KycDiscloseInput = {
  data_padded: string[];
  compressed_disclose_sel: string[];
  merkle_root: string[];
  leaf_depth: string[];
  path: string[];
  siblings: string[];
  scope: string;
  forbidden_countries_list: string[];
  ofac_name_dob_smt_leaf_key: string[];
  ofac_name_dob_smt_root: string[];
  ofac_name_dob_smt_siblings: string[];
  ofac_name_yob_smt_leaf_key: string[];
  ofac_name_yob_smt_root: string[];
  ofac_name_yob_smt_siblings: string[];
  selector_ofac: string[];
  user_identifier: string;
  current_date: string[];
  majority_age_ASCII: number[];
  secret: string;
};

export type KycDisclosePublicInput = {
  attestation_id: string;
  revealedData_packed: string[];
  forbidden_countries_list_packed: string[];
  nullifier: string;
  scope: string;
  user_identifier: string;
  current_date: string[];
  ofac_name_dob_smt_root: string;
  ofac_name_yob_smt_root: string;
};

export type Signature = {
  R: Point<bigint>;
  s: bigint;
};
