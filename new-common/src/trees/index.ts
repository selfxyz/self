// Certificate trees
export { getLeafDscTree, getLeafCscaTree } from './certificate.js';

// Proof generation
export {
  generateMerkleProof,
  generateSMTProof,
  getDscTreeInclusionProof,
  getCscaTreeInclusionProof,
  getCscaTreeRoot,
} from './proof.js';

// Leaf builders (abstract + concrete)
export { LeafBuilder, generateSmallKey } from './leafBuilder.js';
export type { OfacEntry } from './leafBuilder.js';
export {
  PassportLeafBuilder,
  passportLeafBuilder,
  idCardLeafBuilder,
  hashNameMrz,
  hashDobMrz,
  getNameDobLeafFromMrz,
  getNameYobLeafFromMrz,
  getPassportNumberAndNationalityLeafFromMrz,
} from './passportLeafBuilder.js';
export {
  AadhaarLeafBuilder,
  aadhaarLeafBuilder,
  getNameDobLeafAadhaar,
  getNameYobLeafAadhaar,
} from './aadhaarLeafBuilder.js';
export {
  KycLeafBuilder,
  kycLeafBuilder,
  getNameDobLeafKyc,
  getNameYobLeafKyc,
} from './kycLeafBuilder.js';

// OFAC SMT builders
export {
  buildSMT,
  buildPassportSMT,
  buildIdCardSMT,
  buildAadhaarSMT,
  buildKycSMT,
  getCountryLeaf,
  getCountryCode,
} from './ofac.js';

// Backward-compatible aliases for circuit input consumers
export {
  getNameDobLeafFromMrz as getNameDobLeaf,
  getNameYobLeafFromMrz as getNameYobLeaf,
  getPassportNumberAndNationalityLeafFromMrz as getPassportNumberAndNationalityLeaf,
} from './passportLeafBuilder.js';

export type { LeanIMT } from '@openpassport/zk-kit-lean-imt';
export type { SMT } from '@openpassport/zk-kit-smt';
