// Constants exports - using wildcard for now since constants/index.ts uses wildcard exports
export * from './src/constants/index.js';

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
export * as Hash from './src/utils/hash.js';
