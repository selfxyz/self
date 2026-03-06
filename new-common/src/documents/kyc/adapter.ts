import { sha256 } from 'js-sha256';

import type { CertificateData } from '../../foundation/types/certificate.js';
import type { DocumentCategory, DocumentType, KycData } from '../../foundation/types/document.js';
import { KYC_ATTESTATION_ID } from '../../foundation/constants/identity.js';
import type { DisclosureField, DocumentAttribute, IDocument } from '../interface.js';
import {
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
  KYC_ADDRESS_INDEX,
  KYC_ADDRESS_LENGTH,
  createKycSelector,
} from './constants.js';
import type { KycField } from './constants.js';
import { generateKycCommitment, generateKycNullifier } from './utils.js';

const DISCLOSURE_TO_KYC: Record<DisclosureField, KycField[]> = {
  name: ['FULL_NAME'],
  gender: ['GENDER'],
  date_of_birth: ['DOB'],
  nationality: ['COUNTRY'],
  id_number: ['ID_NUMBER'],
  issuing_state: ['COUNTRY'],
  expiry_date: ['EXPIRY_DATE'],
  ofac: [],
  older_than: [],
};

export function disclosureToKycFields(fields: DisclosureField[]): KycField[] {
  const kycFields = new Set<KycField>();
  for (const field of fields) {
    for (const kf of DISCLOSURE_TO_KYC[field]) {
      kycFields.add(kf);
    }
  }
  return [...kycFields];
}

function parseApplicantField(applicantInfoBase64: string, index: number, length: number): string {
  const applicantInfo = Buffer.from(applicantInfoBase64, 'base64').toString('utf-8');
  return applicantInfo.slice(index, index + length).replace(/\x00/g, '');
}

export class KycDocument implements IDocument {
  readonly category: DocumentCategory = 'kyc';
  readonly type: DocumentType;
  readonly raw: KycData;
  readonly isMock: boolean;

  constructor(data: KycData) {
    this.raw = data;
    this.type = data.documentType;
    this.isMock = data.mock;
  }

  getAttribute(name: DocumentAttribute): string | null {
    const info = this.raw.serializedApplicantInfo;
    switch (name) {
      case 'name':
        return parseApplicantField(info, KYC_FULL_NAME_INDEX, KYC_FULL_NAME_LENGTH) || null;
      case 'date_of_birth': {
        const dob = parseApplicantField(info, KYC_DOB_INDEX, KYC_DOB_LENGTH);
        if (!dob) return null;
        // KYC stores DOB as YYYYMMDD, convert to YYMMDD
        return dob.replace(/-/g, '').slice(2);
      }
      case 'nationality':
        return parseApplicantField(info, KYC_COUNTRY_INDEX, KYC_COUNTRY_LENGTH) || null;
      case 'document_number':
        return parseApplicantField(info, KYC_ID_NUMBER_INDEX, KYC_ID_NUMBER_LENGTH) || null;
      case 'gender':
        return parseApplicantField(info, KYC_GENDER_INDEX, KYC_GENDER_LENGTH) || null;
      case 'expiry_date':
        return parseApplicantField(info, KYC_EXPIRY_DATE_INDEX, KYC_EXPIRY_DATE_LENGTH) || null;
      case 'issuing_state':
        return parseApplicantField(info, KYC_COUNTRY_INDEX, KYC_COUNTRY_LENGTH) || null;
    }
  }

  isExpired(): boolean {
    return false;
  }

  getContentHash(): string {
    const info = this.raw.serializedApplicantInfo;
    const fullName = parseApplicantField(info, KYC_FULL_NAME_INDEX, KYC_FULL_NAME_LENGTH);
    const dob = parseApplicantField(info, KYC_DOB_INDEX, KYC_DOB_LENGTH);
    const country = parseApplicantField(info, KYC_COUNTRY_INDEX, KYC_COUNTRY_LENGTH);
    const idType = parseApplicantField(info, KYC_ID_TYPE_INDEX, KYC_ID_TYPE_LENGTH);
    return sha256(`${fullName}${dob}${country}${idType}`);
  }

  getAttestationId(): string {
    return KYC_ATTESTATION_ID;
  }

  getDscParsed(): CertificateData | undefined {
    return undefined;
  }

  getCscaParsed(): CertificateData | undefined {
    return undefined;
  }

  getRegisterCircuitName(): string {
    return 'register_kyc';
  }

  generateCommitment(secret: string): string {
    return generateKycCommitment(this.raw, secret);
  }

  generateNullifier(): string {
    return generateKycNullifier(this.raw).toString();
  }

  getDscCircuitName(): string {
    throw new Error('KYC documents do not have a DSC circuit');
  }

  getAttributePositions(): Record<string, number[]> {
    return {
      country: [KYC_COUNTRY_INDEX, KYC_COUNTRY_INDEX + KYC_COUNTRY_LENGTH - 1],
      id_type: [KYC_ID_TYPE_INDEX, KYC_ID_TYPE_INDEX + KYC_ID_TYPE_LENGTH - 1],
      id_number: [KYC_ID_NUMBER_INDEX, KYC_ID_NUMBER_INDEX + KYC_ID_NUMBER_LENGTH - 1],
      issuance_date: [
        KYC_ISSUANCE_DATE_INDEX,
        KYC_ISSUANCE_DATE_INDEX + KYC_ISSUANCE_DATE_LENGTH - 1,
      ],
      expiry_date: [KYC_EXPIRY_DATE_INDEX, KYC_EXPIRY_DATE_INDEX + KYC_EXPIRY_DATE_LENGTH - 1],
      full_name: [KYC_FULL_NAME_INDEX, KYC_FULL_NAME_INDEX + KYC_FULL_NAME_LENGTH - 1],
      dob: [KYC_DOB_INDEX, KYC_DOB_INDEX + KYC_DOB_LENGTH - 1],
      photo_hash: [KYC_PHOTO_HASH_INDEX, KYC_PHOTO_HASH_INDEX + KYC_PHOTO_HASH_LENGTH - 1],
      phone_number: [KYC_PHONE_NUMBER_INDEX, KYC_PHONE_NUMBER_INDEX + KYC_PHONE_NUMBER_LENGTH - 1],
      gender: [KYC_GENDER_INDEX, KYC_GENDER_INDEX + KYC_GENDER_LENGTH - 1],
      address: [KYC_ADDRESS_INDEX, KYC_ADDRESS_INDEX + KYC_ADDRESS_LENGTH - 1],
    };
  }

  getRevealBitmap(disclosures: Record<string, boolean>): number[] {
    // Placeholder — full implementation with createKycSelector in Task 9
    return Object.entries(disclosures)
      .filter(([_, disclosed]) => disclosed)
      .map(([_, __], i) => i);
  }

  getDisclosureSlice(attribute: string): string {
    const positions = this.getAttributePositions();
    const pos = positions[attribute];
    if (!pos) return '';
    const applicantInfo = Buffer.from(this.raw.serializedApplicantInfo, 'base64').toString('utf-8');
    return applicantInfo.slice(pos[0], pos[1] + 1).replace(/\x00/g, '');
  }

  buildDisclosureSelector(fields: DisclosureField[]): [bigint, bigint] {
    const kycFields = disclosureToKycFields(fields);
    return createKycSelector(kycFields);
  }
}
