export type { IDocument, CircuitType, DocumentAttribute, DisclosureField } from './interface.js';
export { createDocument } from './factory.js';
export { calculateContentHash } from './contentHash.js';

// Passport
export { PassportDocument } from './passport/index.js';
export { bruteForceSignatureAlgorithm, verifySignature } from './passport/index.js';
export { generateCommitment, generateNullifier, getPassportSignatureInfos } from './passport/index.js';
export { pad, padWithZeroes, inferDocumentCategory } from './passport/index.js';
export {
  formatAndConcatenateDataHashes,
  formatDG1Attribute,
  formatDg2Hash,
  formatMrz,
  formatName,
  generateSignedAttr,
} from './passport/index.js';
export {
  getCountryCodeFromMrz,
  getCurveOrExponent as getPassportCurveOrExponent,
  parsePassportData,
  initPassportDataParsing,
} from './passport/index.js';
export type { AlternativeCSCA, PassportSupportStatus } from './passport/index.js';
export {
  checkDocumentSupported,
  checkIfPassportDscIsInTree,
  isDocumentNullified,
  isUserRegistered,
  isUserRegisteredWithAlternativeCSCA,
} from './passport/index.js';

// Aadhaar
export { AadhaarDocument } from './aadhaar/index.js';
export { extractQRDataFields, stringToAsciiArray, getCurrentDate } from './aadhaar/index.js';
export { processQRData, findDelimiterIndices, findPhotoEOI, extractSignatureBytes } from './aadhaar/index.js';
export type { ProcessedQRData } from './aadhaar/index.js';

// KYC
export { KycDocument, disclosureToKycFields } from './kyc/index.js';
export { createKycSelector } from './kyc/index.js';
export type { KycField as KycSelectorField } from './kyc/constants.js';
export { deserializeApplicantInfo, deserializeSignature } from './kyc/index.js';
export { serializeKycData } from './kyc/index.js';
export { generateKycCommitment, generateKycNullifier } from './kyc/index.js';
