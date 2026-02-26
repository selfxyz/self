import type { CertificateData } from './certificate.js';

export interface ExtractedQRData {
  name: string;
  yob: string;
  mob: string;
  dob: string;
  gender: string;
  pincode: string;
  state: string;
  aadhaarLast4Digits: string;
  phoneNoLast4Digits: string;
  timestamp: string;
}

export type KycField =
  | 'COUNTRY'
  | 'ID_TYPE'
  | 'ID_NUMBER'
  | 'ISSUANCE_DATE'
  | 'EXPIRY_DATE'
  | 'FULL_NAME'
  | 'DOB'
  | 'PHOTO_HASH'
  | 'PHONE_NUMBER'
  | 'GENDER'
  | 'ADDRESS';

export interface PassportMetadata {
  dataGroups: string;
  dg1Size: number;
  dg1HashSize: number;
  dg1HashFunction: string;
  dg1HashOffset: number;
  dgPaddingBytes: number;
  eContentSize: number;
  eContentHashFunction: string;
  eContentHashOffset: number;
  signedAttrSize: number;
  signedAttrHashFunction: string;
  signatureAlgorithm: string;
  saltLength: number;
  curveOrExponent: string;
  signatureAlgorithmBits: number;
  countryCode: string;
  cscaFound: boolean;
  cscaHashFunction: string;
  cscaSignatureAlgorithm: string;
  cscaSaltLength: number;
  cscaCurveOrExponent: string;
  cscaSignatureAlgorithmBits: number;
  dsc: string;
  csca: string;
}

export interface BaseIDData {
  documentType: DocumentType;
  documentCategory: DocumentCategory;
  mock: boolean;
  dsc_parsed?: CertificateData;
  csca_parsed?: CertificateData;
}

export interface AadhaarData extends BaseIDData {
  documentCategory: 'aadhaar';
  qrData: string;
  extractedFields: ExtractedQRData;
  signature: number[];
  publicKey: string;
  photoHash?: string;
}

export type DeployedCircuits = {
  REGISTER: string[];
  REGISTER_ID: string[];
  REGISTER_AADHAAR: string[];
  REGISTER_KYC: string[];
  DSC: string[];
  DSC_ID: string[];
};

export interface DocumentCatalog {
  documents: DocumentMetadata[];
  selectedDocumentId?: string;
}

export type DocumentCategory = 'passport' | 'id_card' | 'aadhaar' | 'kyc';

export interface DocumentMetadata {
  id: string;
  documentType: string;
  documentCategory: DocumentCategory;
  data: string;
  mock: boolean;
  isRegistered?: boolean;
  registeredAt?: number;
  hasExpirationDate?: boolean;
  idType?: string;
}

export type DocumentType =
  | 'passport'
  | 'id_card'
  | 'aadhaar'
  | 'drivers_licence'
  | 'mock_passport'
  | 'mock_id_card'
  | 'mock_aadhaar';

export type IDDocument = AadhaarData | KycData | PassportData;

export interface KycData extends BaseIDData {
  documentCategory: 'kyc';
  serializedApplicantInfo: string;
  signature: string;
  pubkey: string[];
}

export interface PassportData extends BaseIDData {
  documentCategory: 'passport' | 'id_card';
  mrz: string;
  dg1Hash?: number[];
  dg2Hash?: number[];
  dgPresents?: any[];
  dsc: string;
  eContent: number[];
  signedAttr: number[];
  encryptedDigest: number[];
  passportMetadata?: PassportMetadata;
}

export type PendingKycStatus = 'pending' | 'processing' | 'failed';

export interface PendingKycVerification {
  userId: string;
  createdAt: number;
  status: PendingKycStatus;
  errorMessage?: string;
  timeoutAt: number;
  documentId?: string;
}

export type Proof = {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  pub_signals: string[];
};

export type SignatureAlgorithm =
  | 'rsa_sha1_65537_2048'
  | 'rsa_sha256_65537_2048'
  | 'rsa_sha384_65537_4096'
  | 'rsapss_sha256_65537_2048'
  | 'rsapss_sha256_65537_2048_64'
  | 'rsapss_sha256_3_4096'
  | 'rsapss_sha256_3_3072'
  | 'rsapss_sha384_65537_3072'
  | 'rsapss_sha384_65537_4096'
  | 'rsapss_sha384_65537_2048'
  | 'rsa_sha256_3_4096'
  | 'rsa_sha512_65537_2048'
  | 'rsa_sha1_65537_4096'
  | 'ecdsa_sha256_secp256r1_256'
  | 'ecdsa_sha1_secp256r1_256'
  | 'ecdsa_sha224_secp224r1_224'
  | 'ecdsa_sha384_secp384r1_384'
  | 'ecdsa_sha1_brainpoolP256r1_256'
  | 'ecdsa_sha256_brainpoolP256r1_256'
  | 'rsa_sha256_3_2048'
  | 'rsa_sha256_65537_3072'
  | 'rsa_sha256_65537_4096'
  | 'rsa_sha512_65537_4096'
  | 'rsa_sha224_65537_2048'
  | 'rsapss_sha256_65537_3072'
  | 'rsapss_sha256_65537_4096'
  | 'rsapss_sha256_3_2048'
  | 'rsapss_sha512_3_4096'
  | 'rsapss_sha512_3_2048'
  | 'rsapss_sha384_3_4096'
  | 'rsapss_sha384_3_3072'
  | 'rsapss_sha512_65537_4096'
  | 'rsapss_sha512_65537_2048'
  | 'ecdsa_sha256_secp384r1_384'
  | 'ecdsa_sha256_secp521r1_521'
  | 'ecdsa_sha512_secp521r1_521'
  | 'ecdsa_sha384_brainpoolP256r1_256'
  | 'ecdsa_sha512_brainpoolP256r1_256'
  | 'ecdsa_sha256_brainpoolP384r1_384'
  | 'ecdsa_sha384_brainpoolP384r1_384'
  | 'ecdsa_sha512_brainpoolP384r1_384'
  | 'ecdsa_sha1_brainpoolP224r1_224'
  | 'ecdsa_sha224_brainpoolP224r1_224'
  | 'ecdsa_sha256_brainpoolP224r1_224'
  | 'ecdsa_sha384_brainpoolP512r1_512'
  | 'ecdsa_sha512_brainpoolP512r1_512'
  | 'rsapss_sha256_65537_4096_32'
  | 'rsapss_sha256_65537_2048_32'
  | 'rsa_sha1_64321_4096'
  | 'rsa_sha256_130689_4096'
  | 'rsa_sha256_122125_4096'
  | 'rsa_sha256_107903_4096'
  | 'rsa_sha256_56611_4096';

export enum AttestationIdHex {
  invalid = '0x0000000000000000000000000000000000000000000000000000000000000000',
  passport = '0x0000000000000000000000000000000000000000000000000000000000000001',
  id_card = '0x0000000000000000000000000000000000000000000000000000000000000002',
  aadhaar = '0x0000000000000000000000000000000000000000000000000000000000000003',
  kyc = '0x0000000000000000000000000000000000000000000000000000000000000004',
}

