import { Country3LetterCode as Country3LetterCode1 } from './constants/countries.js';
import { Country3LetterCode as Country3LetterCode2, REDIRECT_URL } from './constants/constants.js';
import {
  CertificateData,
  PublicKeyDetailsECDSA,
  PublicKeyDetailsRSA,
} from './utils/certificate_parsing/dataStructure.js';
import { parseCertificateSimple } from './utils/certificate_parsing/parseCertificateSimple.js';
import {
  findStartPubKeyIndex,
  generateCommitment,
  generateNullifier,
} from './utils/passports/passport.js';
import { parseDscCertificateData } from './utils/passports/passport_parsing/parseDscCertificateData.js';
import { getLeafCscaTree, getLeafDscTree } from './utils/trees.js';
import {
  genMockIdDoc,
  genMockIdDocAndInitDataParsing,
  IdDocInput,
} from './utils/passports/genMockIdDoc.js';
import { brutforceSignatureAlgorithmDsc } from './utils/passports/passport_parsing/brutForceDscSignature.js';
export { initElliptic } from './utils/certificate_parsing/elliptic.js';
export { getSKIPEM } from './utils/csca.js';
export { formatMrz } from './utils/passports/format.js';
export { getCircuitNameFromPassportData } from './utils/circuits/circuitsName.js';
import * as Hash from './utils/hash.js';
export * from './constants/countries.js';
export * from './constants/constants.js';
export * from './utils/appType.js';
export * from './utils/scope.js';
export type { PassportData, DocumentType, DocumentCategory } from './utils/types.js';
export type Country3LetterCode = Country3LetterCode1 & Country3LetterCode2;
export { initPassportDataParsing } from './utils/passports/passport.js';
export { genAndInitMockPassportData } from './utils/passports/genMockPassportData.js';

export type { UserIdType } from './utils/circuits/uuid.js';
export {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from './utils/circuits/generateInputs.js';
export type { PassportMetadata } from './utils/passports/passport_parsing/parsePassportData.js';

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
  genMockIdDocAndInitDataParsing,
};
