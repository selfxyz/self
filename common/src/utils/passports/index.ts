export {
  initPassportDataParsing,
  findStartPubKeyIndex,
  generateCommitment,
  generateNullifier,
  getNAndK,
} from './passport.js';

export { genMockIdDoc, generateMockDSC, genMockIdDocAndInitDataParsing } from './genMockIdDoc.js';

export { genAndInitMockPassportData } from './genMockPassportData.js';

export { parseDscCertificateData } from './passport_parsing/parseDscCertificateData.js';

export { brutforceSignatureAlgorithmDsc } from './passport_parsing/brutForceDscSignature.js';

// Re-export types
export type { IdDocInput } from './genMockIdDoc.js';
export type { PassportMetadata } from './passport_parsing/parsePassportData.js';
