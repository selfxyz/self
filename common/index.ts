// Type exports from constants
export type {
  AadhaarData,
  CertificateData,
  DeployedCircuits,
  DocumentCatalog,
  DocumentCategory,
  DocumentMetadata,
  IDDocument,
  IdDocInput,
  OfacTree,
  PassportData,
  PassportMetadata,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
  SelfApp,
  SelfAppDisclosureConfig,
  UserIdType,
} from './src/utils/index.js';

// Constants exports
export type { Country3LetterCode } from './src/constants/index.js';

// Additional type exports
export type { Environment } from './src/utils/types.js';

// Utils exports
export {
  API_URL,
  API_URL_STAGING,
  CSCA_TREE_URL,
  CSCA_TREE_URL_ID_CARD,
  CSCA_TREE_URL_STAGING,
  CSCA_TREE_URL_STAGING_ID_CARD,
  DEFAULT_MAJORITY,
  DSC_TREE_URL,
  DSC_TREE_URL_ID_CARD,
  DSC_TREE_URL_STAGING,
  DSC_TREE_URL_STAGING_ID_CARD,
  IDENTITY_TREE_URL,
  IDENTITY_TREE_URL_ID_CARD,
  IDENTITY_TREE_URL_STAGING,
  IDENTITY_TREE_URL_STAGING_ID_CARD,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
  PCR0_MANAGER_ADDRESS,
  REDIRECT_URL,
  RPC_URL,
  TREE_URL,
  TREE_URL_STAGING,
  WS_DB_RELAYER,
  WS_DB_RELAYER_STAGING,
  alpha2ToAlpha3,
  alpha3ToAlpha2,
  attributeToPosition,
  attributeToPosition_ID,
  commonNames,
  countries,
  countryCodes,
  getCountryISO2,
} from './src/constants/index.js';

// Type exports
export {
  EndpointType,
  Mode,
  SelfAppBuilder,
  bigIntToString,
  brutforceSignatureAlgorithmDsc,
  buildSMT,
  calculateContentHash,
  calculateUserIdentifierHash,
  fetchOfacTrees,
  findStartPubKeyIndex,
  formatEndpoint,
  formatMrz,
  genAndInitMockPassportData,
  genMockIdDoc,
  genMockIdDocAndInitDataParsing,
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsRegisterForTests,
  generateCircuitInputsVCandDisclose,
  generateCommitment,
  generateMockDSC,
  generateNullifier,
  generateTEEInputsDiscloseStateless,
  getCircuitNameFromPassportData,
  getLeafCscaTree,
  getLeafDscTree,
  getSKIPEM,
  getSolidityPackedUserContextData,
  getUniversalLink,
  hashEndpointWithScope,
  inferDocumentCategory,
  initElliptic,
  initPassportDataParsing,
  parseCertificateSimple,
  parseDscCertificateData,
  stringToBigInt,
} from './src/utils/index.js';

// Crypto polyfill for cross-platform compatibility
export {
  createHash,
  createHmac,
  default as cryptoPolyfill,
  pbkdf2Sync,
  randomBytes,
} from './src/polyfills/crypto.js';

export { createSelector } from './src/utils/aadhaar/constants.js';

// Hash utilities
export {
  customHasher,
  flexiblePoseidon,
  getHashLen,
  hash,
  packBytesAndPoseidon,
} from './src/utils/hash.js';

export { generateTestData, testCustomData } from './src/utils/aadhaar/utils.js';

export { isAadhaarDocument, isMRZDocument } from './src/utils/index.js';

export {
  prepareAadhaarDiscloseData,
  prepareAadhaarDiscloseTestData,
  prepareAadhaarRegisterData,
  prepareAadhaarRegisterTestData,
} from './src/utils/aadhaar/mockData.js';
