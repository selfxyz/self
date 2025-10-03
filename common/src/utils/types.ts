import type { ExtractedQRData } from './aadhaar/utils.js';
import type { CertificateData } from './certificate_parsing/dataStructure.js';
import type { PassportMetadata } from './passports/passport_parsing/parsePassportData.js';

// Base interface for common fields
interface BaseIDData {
  documentType: DocumentType;
  documentCategory: DocumentCategory;
  mock: boolean;
  dsc_parsed?: CertificateData;
  csca_parsed?: CertificateData;
}

// Aadhaar document data
export interface AadhaarData extends BaseIDData {
  documentCategory: 'aadhaar';
  qrData: string;
  extractedFields: ExtractedQRData; // All parsed Aadhaar fields
  signature: number[];
  publicKey: string;
  photoHash?: string;
}

export type DeployedCircuits = {
  REGISTER: string[];
  REGISTER_ID: string[];
  REGISTER_AADHAAR: string[];
  DSC: string[];
  DSC_ID: string[];
};

export interface DocumentCatalog {
  documents: DocumentMetadata[];
  selectedDocumentId?: string; // This is now a contentHash
}

export type DocumentCategory = 'passport' | 'id_card' | 'aadhaar';

export interface DocumentMetadata {
  id: string; // contentHash as ID for deduplication
  documentType: string; // passport, mock_passport, id_card, etc.
  documentCategory: DocumentCategory; // passport, id_card, aadhaar
  data: string; // DG1/MRZ data for passports/IDs, relevant data for aadhaar
  mock: boolean; // whether this is a mock document
  isRegistered?: boolean; // whether the document is registered onChain
  registeredAt?: number; // timestamp (epoch ms) when document was registered
}

export type DocumentType =
  | 'passport'
  | 'id_card'
  | 'aadhaar'
  | 'mock_passport'
  | 'mock_id_card'
  | 'mock_aadhaar';

export type Environment = 'prod' | 'stg';

export type IDDocument = AadhaarData | PassportData;

export type OfacTree = {
  passportNoAndNationality: any;
  nameAndDob: any;
  nameAndYob: any;
};

// Define the signature algorithm in "algorithm_hashfunction_domainPapameter_keyLength"
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

export type Proof = {
  proof: {
    a: [string, string];
    b: [[string, string], [string, string]];
    c: [string, string];
  };
  pub_signals: string[];
};

// Define the signature algorithm in "algorithm_hashfunction_domainPapameter_keyLength"
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

// keys should match DocumentCategory
export enum AttestationIdHex {
  invalid = '0x0000000000000000000000000000000000000000000000000000000000000000',
  passport = '0x0000000000000000000000000000000000000000000000000000000000000001',
  id_card = '0x0000000000000000000000000000000000000000000000000000000000000002',
  aadhaar = '0x0000000000000000000000000000000000000000000000000000000000000003',
}

export function castCSCAProof(proof: any): Proof {
  return {
    proof: {
      a: proof.proof.pi_a.slice(0, 2),
      b: [proof.proof.pi_b[0].slice(0, 2), proof.proof.pi_b[1].slice(0, 2)],
      c: proof.proof.pi_c.slice(0, 2),
    },
    pub_signals: proof.pub_signals,
  };
}

export function isAadhaarDocument(
  passportData: PassportData | AadhaarData
): passportData is AadhaarData {
  return passportData.documentCategory === 'aadhaar';
}

export function isMRZDocument(
  passportData: PassportData | AadhaarData
): passportData is PassportData {
  return (
    passportData.documentCategory === 'passport' || passportData.documentCategory === 'id_card'
  );
}
