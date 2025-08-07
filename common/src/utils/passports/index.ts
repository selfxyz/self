export type { IdDocInput } from './genMockIdDoc.js';
export type { PassportMetadata } from './passport_parsing/parsePassportData.js';
export { brutforceSignatureAlgorithmDsc } from './passport_parsing/brutForceDscSignature.js';
// Re-export types
export {
  findStartPubKeyIndex,
  generateCommitment,
  generateNullifier,
  getNAndK,
  initPassportDataParsing,
} from './passport.js';

export { genAndInitMockPassportData } from './genMockPassportData.js';

export { genMockIdDoc, genMockIdDocAndInitDataParsing, generateMockDSC } from './genMockIdDoc.js';
export { parseDscCertificateData } from './passport_parsing/parseDscCertificateData.js';
