import { poseidon2 } from 'poseidon-lite';

import { packBytesAndPoseidon } from '../../crypto/hash/poseidon.js';
import type { KycData as KycDocumentData } from '../../foundation/types/document.js';
import {
  KYC_ID_NUMBER_INDEX,
  KYC_ID_NUMBER_LENGTH,
  KYC_ID_TYPE_INDEX,
  KYC_ID_TYPE_LENGTH,
} from './constants.js';

const decodeRawBytes = (base64: string): number[] => {
  const raw = Buffer.from(base64, 'base64');
  return Array.from(raw, b => Number(b));
};

export const generateKycCommitment = (kycData: KycDocumentData, secret: string) => {
  const dataPadded = decodeRawBytes(kycData.serializedApplicantInfo);
  const commitment = poseidon2([secret, packBytesAndPoseidon(dataPadded)]);
  return commitment.toString();
};

export const generateKycNullifier = (kycData: KycDocumentData) => {
  const dataPadded = decodeRawBytes(kycData.serializedApplicantInfo);
  const idNumber = dataPadded.slice(
    KYC_ID_NUMBER_INDEX,
    KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH,
  );
  const nullifierInputs = [
    ...idNumber,
    ...dataPadded.slice(KYC_ID_TYPE_INDEX, KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH),
  ];
  const nullifier = packBytesAndPoseidon(nullifierInputs);
  return nullifier;
};
