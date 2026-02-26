import { poseidon2 } from 'poseidon-lite';

import { packBytesAndPoseidon } from '../../crypto/hash/poseidon.js';
import type { KycData as KycDocumentData } from '../../foundation/types/document.js';
import { deserializeApplicantInfo } from './api.js';
import {
  KYC_ID_NUMBER_INDEX,
  KYC_ID_NUMBER_LENGTH,
  KYC_ID_TYPE_INDEX,
  KYC_ID_TYPE_LENGTH,
} from './constants.js';
import { serializeKycData } from './types.js';

export const generateKycCommitment = (kycData: KycDocumentData, secret: string) => {
  const applicantInfo = deserializeApplicantInfo(kycData.serializedApplicantInfo);
  const serializedData = serializeKycData(applicantInfo);
  const msgPadded = Array.from(serializedData, (x) => x.charCodeAt(0));
  const dataPadded = msgPadded.map((x) => Number(x));
  const commitment = poseidon2([secret, packBytesAndPoseidon(dataPadded)]);
  return commitment.toString();
};

export const generateKycNullifier = (kycData: KycDocumentData) => {
  const applicantInfo = deserializeApplicantInfo(kycData.serializedApplicantInfo);
  const serializedData = serializeKycData(applicantInfo);
  const msgPadded = Array.from(serializedData, (x) => x.charCodeAt(0));
  const dataPadded = msgPadded.map((x) => Number(x));
  const idNumber = dataPadded.slice(
    KYC_ID_NUMBER_INDEX,
    KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH
  );
  const nullifierInputs = [
    ...'sumsub'.split('').map((x) => x.charCodeAt(0)),
    ...idNumber,
    ...dataPadded.slice(KYC_ID_TYPE_INDEX, KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH),
  ];
  const nullifier = packBytesAndPoseidon(nullifierInputs);
  return nullifier;
};
