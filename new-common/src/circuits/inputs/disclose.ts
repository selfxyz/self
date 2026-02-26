import { COMMITMENT_TREE_DEPTH, OFAC_TREE_LEVELS } from '../../foundation/constants/circuit.js';
import type { PassportData } from '../../foundation/types/document.js';
import { hash, packBytesAndPoseidon } from '../../crypto/hash/index.js';
import { getCurrentDateYYMMDD } from '../../foundation/date.js';
import { generateCommitment } from '../../documents/passport/commitment.js';
import { formatMrz } from '../../documents/passport/format.js';
import {
  generateMerkleProof,
  generateSMTProof,
  getLeafDscTree,
  getNameDobLeaf,
  getNameYobLeaf,
  getPassportNumberAndNationalityLeaf,
} from '../../trees/index.js';
import type { LeanIMT, SMT } from '../../trees/index.js';
import { formatCountriesList, formatInput } from './format.js';

export function findIndexInTree(tree: LeanIMT, commitment: bigint): number {
  let index = tree.indexOf(commitment);
  if (index === -1) {
    index = tree.indexOf(commitment.toString() as unknown as bigint);
  }
  if (index === -1) {
    throw new Error('This commitment was not found in the tree');
  }
  return index;
}

export function generateCircuitInputsVCandDisclose(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  scope: string,
  selector_dg1: string[],
  selector_older_than: string | number,
  merkletree: LeanIMT,
  majority: string,
  passportNo_smt: SMT | null,
  nameAndDob_smt: SMT,
  nameAndYob_smt: SMT,
  selector_ofac: string | number,
  forbidden_countries_list: string[],
  user_identifier: string
) {
  const { mrz, eContent, documentType } = passportData;
  const passportMetadata = passportData.passportMetadata!;
  const isPassportType = documentType === 'passport' || documentType === 'mock_passport';

  const formattedMrz = formatMrz(mrz);

  const eContent_shaBytes = hash(
    passportMetadata.eContentHashFunction,
    Array.from(eContent),
    'bytes'
  );
  const eContent_packed_hash = packBytesAndPoseidon(
    (eContent_shaBytes as number[]).map((byte) => byte & 0xff)
  );

  const dsc_tree_leaf = getLeafDscTree(passportData.dsc_parsed!, passportData.csca_parsed!);

  const commitment = generateCommitment(secret, attestation_id, passportData);
  const index = findIndexInTree(merkletree, BigInt(commitment));
  const { siblings, path, leaf_depth } = generateMerkleProof(
    merkletree,
    index,
    COMMITMENT_TREE_DEPTH
  );

  const formattedMajority = majority.length === 1 ? `0${majority}` : majority;
  const majority_ascii = formattedMajority.split('').map((char) => char.charCodeAt(0));

  const defaultSiblings = Array(OFAC_TREE_LEVELS).fill(BigInt(0));
  let passportNoProof = {
    root: BigInt(0),
    closestleaf: BigInt(0),
    siblings: defaultSiblings,
  };

  const nameSlice = isPassportType ? formattedMrz.slice(10, 49) : formattedMrz.slice(65, 95);
  const dobSlice = isPassportType ? formattedMrz.slice(62, 68) : formattedMrz.slice(35, 41);
  const yobSlice = isPassportType ? formattedMrz.slice(62, 64) : formattedMrz.slice(35, 37);
  const nationalitySlice = isPassportType
    ? formattedMrz.slice(59, 62)
    : formattedMrz.slice(50, 53);
  const passNoSlice = isPassportType ? formattedMrz.slice(49, 58) : formattedMrz.slice(10, 19);

  const namedob_leaf = getNameDobLeaf(nameSlice, dobSlice);
  const nameyob_leaf = getNameYobLeaf(nameSlice, yobSlice);

  const nameDobProof = generateSMTProof(nameAndDob_smt, namedob_leaf);
  const nameYobProof = generateSMTProof(nameAndYob_smt, nameyob_leaf);

  if (isPassportType) {
    if (!passportNo_smt) {
      console.warn('Document type is passport, but passportNo_smt tree was not provided.');
    } else {
      const passportNo_leaf = getPassportNumberAndNationalityLeaf(passNoSlice, nationalitySlice);
      const proofResult = generateSMTProof(passportNo_smt, passportNo_leaf);
      passportNoProof = {
        root: BigInt(proofResult.root),
        closestleaf: BigInt(proofResult.closestleaf),
        siblings: proofResult.siblings,
      };
    }
  }

  const baseInputs = {
    secret: formatInput(secret),
    attestation_id: formatInput(attestation_id),
    dg1: formatInput(formattedMrz),
    eContent_shaBytes_packed_hash: formatInput(eContent_packed_hash),
    dsc_tree_leaf: formatInput(dsc_tree_leaf),
    merkle_root: formatInput(merkletree.root),
    leaf_depth: formatInput(leaf_depth),
    path: formatInput(path),
    siblings: formatInput(siblings),
    selector_dg1: formatInput(selector_dg1),
    selector_older_than: formatInput(selector_older_than),
    scope: formatInput(scope),
    current_date: formatInput(getCurrentDateYYMMDD()),
    majority: formatInput(majority_ascii),
    user_identifier: formatInput(user_identifier),
    selector_ofac: formatInput(selector_ofac),
    forbidden_countries_list: formatInput(formatCountriesList(forbidden_countries_list)),
  };

  const ofacNameInputs = {
    ofac_namedob_smt_root: formatInput(nameDobProof.root),
    ofac_namedob_smt_leaf_key: formatInput(nameDobProof.closestleaf),
    ofac_namedob_smt_siblings: formatInput(nameDobProof.siblings),
    ofac_nameyob_smt_root: formatInput(nameYobProof.root),
    ofac_nameyob_smt_leaf_key: formatInput(nameYobProof.closestleaf),
    ofac_nameyob_smt_siblings: formatInput(nameYobProof.siblings),
  };

  return {
    ...baseInputs,
    ...ofacNameInputs,
    ...(isPassportType && {
      ofac_passportno_smt_root: formatInput(passportNoProof.root),
      ofac_passportno_smt_leaf_key: formatInput(passportNoProof.closestleaf),
      ofac_passportno_smt_siblings: formatInput(passportNoProof.siblings),
    }),
  };
}
