// Constants exports
export {
  TREE_URL,
  TREE_URL_STAGING,
  API_URL,
  API_URL_STAGING,
  WS_DB_RELAYER,
  WS_DB_RELAYER_STAGING,
  PCR0_MANAGER_ADDRESS,
  RPC_URL,
  PASSPORT_ATTESTATION_ID,
  ID_CARD_ATTESTATION_ID,
  DEFAULT_MAJORITY,
  attributeToPosition,
  attributeToPosition_ID,
  countryCodes,
  commonNames,
  countries,
  CSCA_TREE_URL,
  DSC_TREE_URL,
  CSCA_TREE_URL_STAGING,
  DSC_TREE_URL_STAGING,
  IDENTITY_TREE_URL,
  IDENTITY_TREE_URL_STAGING,
  CSCA_TREE_URL_ID_CARD,
  DSC_TREE_URL_ID_CARD,
  CSCA_TREE_URL_STAGING_ID_CARD,
  DSC_TREE_URL_STAGING_ID_CARD,
  IDENTITY_TREE_URL_ID_CARD,
  IDENTITY_TREE_URL_STAGING_ID_CARD,
} from './src/constants/index.js';

// Type exports from constants
export type { Country3LetterCode } from './src/constants/index.js';

// Utils exports
export {
  initPassportDataParsing,
  findStartPubKeyIndex,
  generateCommitment,
  generateNullifier,
  genMockIdDoc,
  generateMockDSC,
  genMockIdDocAndInitDataParsing,
  genAndInitMockPassportData,
  parseDscCertificateData,
  brutforceSignatureAlgorithmDsc,
  parseCertificateSimple,
  initElliptic,
  getSKIPEM,
  formatMrz,
  getCircuitNameFromPassportData,
  calculateUserIdentifierHash,
  getSolidityPackedUserContextData,
  getLeafCscaTree,
  getLeafDscTree,
  buildSMT,
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
  Mode,
  EndpointType,
  SelfAppBuilder,
  getUniversalLink,
  formatEndpoint,
  hashEndpointWithScope,
  stringToBigInt,
  bigIntToString,
} from './src/utils/index.js';

// Type exports
export type {
  IdDocInput,
  CertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
  PassportMetadata,
  UserIdType,
  SelfApp,
  SelfAppDisclosureConfig,
  PassportData,
  DocumentCategory,
} from './src/utils/index.js';

// Hash utilities
export {
  flexiblePoseidon,
  hash,
  getHashLen,
  customHasher,
  packBytesAndPoseidon,
} from './src/utils/hash.js';
