import { poseidon2 } from 'poseidon-lite';

import { packBytesAndPoseidon } from '../hash.js';
import { IDDocument, isKycDocument } from '../types.js';
import { deserializeApplicantInfo } from './api.js';
import {
  KYC_ID_NUMBER_INDEX,
  KYC_ID_NUMBER_LENGTH,
  KYC_ID_TYPE_INDEX,
  KYC_ID_TYPE_LENGTH,
} from './constants.js';
import { serializeKycData } from './types.js';

export const generateKycCommitment = (passportData: IDDocument, secret: string) => {
  if (isKycDocument(passportData)) {
    const applicantInfo = deserializeApplicantInfo(passportData.serializedApplicantInfo);
    const serializedData = serializeKycData(applicantInfo);
    const msgPadded = Array.from(serializedData, (x) => x.charCodeAt(0));
    const dataPadded = msgPadded.map((x) => Number(x));
    const commitment = poseidon2([secret, packBytesAndPoseidon(dataPadded)]);
    return commitment.toString();
  }
};

export const generateKycNullifier = (passportData: IDDocument) => {
  if (isKycDocument(passportData)) {
    const applicantInfo = deserializeApplicantInfo(passportData.serializedApplicantInfo);
    const serializedData = serializeKycData(applicantInfo);
    const msgPadded = Array.from(serializedData, (x) => x.charCodeAt(0));
    const dataPadded = msgPadded.map((x) => Number(x));
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
