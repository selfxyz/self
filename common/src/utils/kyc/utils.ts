import { poseidon2 } from 'poseidon-lite';

import { packBytesAndPoseidon } from '../hash.js';
import { IDDocument, isKycDocument } from '../types.js';
import {
  KYC_ID_NUMBER_INDEX,
  KYC_ID_NUMBER_LENGTH,
  KYC_ID_TYPE_INDEX,
  KYC_ID_TYPE_LENGTH,
} from './constants.js';

const decodeRawBytes = (base64: string): number[] => {
  const raw = Buffer.from(base64, 'base64');
  return Array.from(raw, (b) => Number(b));
};

export const generateKycCommitment = (passportData: IDDocument, secret: string) => {
  if (isKycDocument(passportData)) {
    const dataPadded = decodeRawBytes(passportData.serializedApplicantInfo);
    const commitment = poseidon2([secret, packBytesAndPoseidon(dataPadded)]);
    return commitment.toString();
  }
};

export const generateKycNullifier = (passportData: IDDocument) => {
  if (isKycDocument(passportData)) {
    const dataPadded = decodeRawBytes(passportData.serializedApplicantInfo);
    const idNumber = dataPadded.slice(
      KYC_ID_NUMBER_INDEX,
      KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH
    );
    const nullifierInputs = [
      ...idNumber,
      ...dataPadded.slice(KYC_ID_TYPE_INDEX, KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH),
    ];
    const nullifier = packBytesAndPoseidon(nullifierInputs);
    return nullifier;
  }
};
