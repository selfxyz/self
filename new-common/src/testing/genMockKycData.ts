import type { KycData as KycDocumentData } from '../foundation/types/document.js';
import type { KycData } from '../documents/kyc/types.js';
import { serializeKycData } from '../documents/kyc/types.js';
import { KYC_MAX_LENGTH } from '../documents/kyc/constants.js';
import { KycDocument } from '../documents/kyc/adapter.js';

export const NON_OFAC_DUMMY_KYC_DATA: KycData = {
  country: 'KEN',
  idType: 'NATIONAL ID',
  idNumber: '12345678901234567890123456789012',
  issuanceDate: '20200101',
  expiryDate: '20290101',
  fullName: 'John Doe',
  dob: '19900101',
  photoHash: '1234567890',
  phoneNumber: '1234567890',
  gender: 'M',
  address: '1234567890',
  user_identifier: '1234567890',
  current_date: '20250101',
  majority_age_ASCII: '20',
  selector_older_than: '1',
};

export const OFAC_DUMMY_KYC_DATA: KycData = {
  country: 'KEN',
  idType: 'NATIONAL ID',
  idNumber: '12345678901234567890123456789012',
  issuanceDate: '20200101',
  expiryDate: '20290101',
  fullName: 'ABBAS ABU',
  dob: '19481210',
  photoHash: '1234567890',
  phoneNumber: '1234567890',
  gender: 'M',
  address: '1234567890',
  user_identifier: '1234567890',
  current_date: '20250101',
  majority_age_ASCII: '20',
  selector_older_than: '1',
};

export function genMockKycDocument(opts?: { ofac?: boolean; reverse?: boolean }): KycDocument {
  let data = opts?.ofac ? OFAC_DUMMY_KYC_DATA : NON_OFAC_DUMMY_KYC_DATA;

  if (opts?.reverse) {
    data = {
      ...data,
      fullName: data.fullName.split(' ').reverse().join(' '),
    };
  }

  const serializedData = serializeKycData(data).padEnd(KYC_MAX_LENGTH, '\0');
  const serializedApplicantInfo = Buffer.from(serializedData, 'utf-8').toString('base64');

  const kycDocData: KycDocumentData = {
    documentType: 'passport',
    documentCategory: 'kyc',
    mock: true,
    serializedApplicantInfo,
    signature: '',
    pubkey: [],
  };

  return new KycDocument(kycDocData);
}
