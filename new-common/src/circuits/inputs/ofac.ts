import type { PassportData } from '../../foundation/types/document.js';
import { formatMrz } from '../../documents/passport/format.js';
import {
  generateSMTProof,
  getCountryLeaf,
  getNameDobLeaf,
  getNameYobLeaf,
  getPassportNumberAndNationalityLeaf,
} from '../../trees/index.js';
import type { SMT } from '../../trees/index.js';
import { stringToAsciiBigIntArray } from '../userId.js';
import { formatInput } from './format.js';

export function generateCircuitInputsCountryVerifier(
  passportData: PassportData,
  sparsemerkletree: SMT,
) {
  const mrz_bytes = formatMrz(passportData.mrz);
  const usa_ascii = stringToAsciiBigIntArray('USA');
  const country_leaf = getCountryLeaf(usa_ascii, mrz_bytes.slice(7, 10));
  const { root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, country_leaf);

  return {
    dg1: formatInput(mrz_bytes),
    hostCountry: formatInput(usa_ascii),
    smt_leaf_key: formatInput(closestleaf),
    smt_root: formatInput(root),
    smt_siblings: formatInput(siblings),
  };
}

export function generateCircuitInputsOfac(
  passportData: PassportData,
  sparsemerkletree: SMT,
  proofLevel: number,
) {
  const { mrz, documentType } = passportData;
  const isPassportType = documentType === 'passport' || documentType === 'mock_passport';

  const mrz_bytes = formatMrz(mrz);
  const nameSlice = isPassportType
    ? mrz_bytes.slice(5 + 5, 44 + 5)
    : mrz_bytes.slice(60 + 5, 90 + 5);
  const dobSlice = isPassportType
    ? mrz_bytes.slice(57 + 5, 63 + 5)
    : mrz_bytes.slice(30 + 5, 36 + 5);
  const yobSlice = isPassportType
    ? mrz_bytes.slice(57 + 5, 59 + 5)
    : mrz_bytes.slice(30 + 5, 32 + 5);
  const nationalitySlice = isPassportType
    ? mrz_bytes.slice(54 + 5, 57 + 5)
    : mrz_bytes.slice(45 + 5, 48 + 5);
  const passNoSlice = isPassportType
    ? mrz_bytes.slice(44 + 5, 53 + 5)
    : mrz_bytes.slice(5 + 5, 14 + 5);

  let leafToProve: bigint;

  switch (proofLevel) {
    case 3:
      if (!isPassportType) {
        throw new Error(
          'Proof level 3 (Passport Number) is only applicable to passport document types.',
        );
      }
      leafToProve = getPassportNumberAndNationalityLeaf(passNoSlice, nationalitySlice);
      break;
    case 2:
      leafToProve = getNameDobLeaf(nameSlice, dobSlice);
      break;
    case 1:
      leafToProve = getNameYobLeaf(nameSlice, yobSlice);
      break;
    default:
      throw new Error('Invalid proof level specified for OFAC check.');
  }

  const { root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, leafToProve);

  return {
    dg1: formatInput(mrz_bytes),
    smt_leaf_key: formatInput(closestleaf),
    smt_root: formatInput(root),
    smt_siblings: formatInput(siblings),
  };
}
