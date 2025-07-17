import { Country3LetterCode as Country3LetterCode1 } from './src/constants/countries.js';
import {
  Country3LetterCode as Country3LetterCode2,
  REDIRECT_URL,
} from './src/constants/constants.js';
import {
  CertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from './src/utils/certificate_parsing/dataStructure.js';
import { parseCertificateSimple } from './src/utils/certificate_parsing/parseCertificateSimple.js';
import {
  findStartPubKeyIndex,
  generateCommitment,
  generateNullifier,
} from './src/utils/passports/passport.js';
import { parseDscCertificateData } from './src/utils/passports/passport_parsing/parseDscCertificateData.js';
import { getLeafCscaTree, getLeafDscTree } from './src/utils/trees.js';
import {
  genMockIdDoc,
  generateMockDSC,
  genMockIdDocAndInitDataParsing,
  IdDocInput,
} from './src/utils/passports/genMockIdDoc.js';
import { brutforceSignatureAlgorithmDsc } from './src/utils/passports/passport_parsing/brutForceDscSignature.js';
import { buildSMT } from './src/utils/trees.js';
export { initElliptic } from './src/utils/certificate_parsing/elliptic.js';
export { getSKIPEM } from './src/utils/csca.js';
export { formatMrz } from './src/utils/passports/format.js';
export { getCircuitNameFromPassportData } from './src/utils/circuits/circuitsName.js';
import * as Hash from './src/utils/hash.js';
import { calculateUserIdentifierHash, getSolidityPackedUserContextData } from './src/utils/hash.js';
export * from './src/constants/countries.js';
export * from './src/constants/constants.js';
export * from './src/utils/appType.js';
export * from './src/utils/scope.js';
export type { PassportData, DocumentType, DocumentCategory } from './src/utils/types.js';
export type Country3LetterCode = Country3LetterCode1 & Country3LetterCode2;
export { initPassportDataParsing } from './src/utils/passports/passport.js';
export { genAndInitMockPassportData } from './src/utils/passports/genMockPassportData.js';

export type { UserIdType } from './src/utils/circuits/uuid.js';
export {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from './src/utils/circuits/generateInputs.js';
export type { PassportMetadata } from './src/utils/passports/passport_parsing/parsePassportData.js';

export {
  REDIRECT_URL,
  IdDocInput,
  CertificateData,
  brutforceSignatureAlgorithmDsc,
  Hash,
  generateCommitment,
  generateNullifier,
  findStartPubKeyIndex,
  getLeafCscaTree,
  getLeafDscTree,
  parseCertificateSimple,
  parseDscCertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
  genMockIdDoc,
  generateMockDSC,
  genMockIdDocAndInitDataParsing,
  buildSMT,
  calculateUserIdentifierHash,
  getSolidityPackedUserContextData,
};
