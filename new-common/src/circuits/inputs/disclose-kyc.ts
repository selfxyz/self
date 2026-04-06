import { poseidon2 } from 'poseidon-lite';
import type { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import type { SMT } from '@openpassport/zk-kit-smt';

import { packBytesAndPoseidon } from '../../crypto/hash/poseidon.js';
import { COMMITMENT_TREE_DEPTH } from '../../foundation/constants/circuit.js';
import type { DisclosureField } from '../../documents/interface.js';
import { disclosureToKycFields } from '../../documents/kyc/adapter.js';
import { createKycSelector, KYC_MAX_LENGTH } from '../../documents/kyc/constants.js';
import type { KycField } from '../../documents/kyc/constants.js';
import type { KycData, KycDiscloseInput } from '../../documents/kyc/types.js';
import { serializeKycData } from '../../documents/kyc/types.js';
import { NON_OFAC_DUMMY_KYC_DATA, OFAC_DUMMY_KYC_DATA } from '../../testing/genMockKycData.js';
import { deserializeApplicantInfo } from '../../documents/kyc/api.js';
import { getNameDobLeafKyc, getNameYobLeafKyc } from '../../trees/kycLeafBuilder.js';
import { generateMerkleProof, generateSMTProof } from '../../trees/proof.js';
import { findIndexInTree } from './disclose.js';
import { formatInput, formatCountriesList } from './format.js';

export interface KycDiscloseInputOpts {
  merkletree: LeanIMT;
  nameAndDob_smt: SMT;
  nameAndYob_smt: SMT;
  scope: string;
  fieldsToReveal: DisclosureField[];
  user_identifier: string;
  minimumAge?: number;
  forbidden_countries_list?: string[];
  updateTree?: boolean;
}

function generateOfacProof(data: KycData, smt: SMT, proofLevel: number) {
  const name = data.fullName;
  const dob = data.dob;
  const yob = data.dob.slice(0, 4);

  const leaf = proofLevel === 2 ? getNameDobLeafKyc(name, dob) : getNameYobLeafKyc(name, yob);

  const { root, closestleaf, siblings } = generateSMTProof(smt, leaf);

  return {
    smt_root: formatInput(root),
    smt_leaf_key: formatInput(closestleaf),
    smt_siblings: formatInput(siblings),
  };
}

function buildKycDiscloseSelector(fieldsToReveal: KycField[]): string[] {
  const [lowResult, highResult] = createKycSelector(fieldsToReveal);
  return [lowResult.toString(), highResult.toString()];
}

export function generateKycDiscloseInputs(
  serializedApplicantInfo: string,
  secret: string,
  opts: KycDiscloseInputOpts,
): { inputs: KycDiscloseInput } {
  const raw = Buffer.from(serializedApplicantInfo, 'base64');
  const msgPadded = [
    ...Array.from(raw, b => Number(b)),
    ...new Array(Math.max(0, KYC_MAX_LENGTH - raw.length)).fill(0),
  ];

  const commitment = poseidon2([secret, packBytesAndPoseidon(msgPadded)]);

  if (opts.updateTree) {
    opts.merkletree.insert(commitment);
  }

  const index = findIndexInTree(opts.merkletree, commitment);
  const {
    siblings,
    path: merkle_path,
    leaf_depth,
  } = generateMerkleProof(opts.merkletree, index, COMMITMENT_TREE_DEPTH);

  const applicantData = deserializeApplicantInfo(serializedApplicantInfo);
  const ofacData = {
    ...applicantData,
    user_identifier: '',
    current_date: '',
    majority_age_ASCII: '',
    selector_older_than: '',
  } as KycData;

  const nameDobInputs = generateOfacProof(ofacData, opts.nameAndDob_smt, 2);
  const nameYobInputs = generateOfacProof(ofacData, opts.nameAndYob_smt, 1);

  const kycFields = disclosureToKycFields(opts.fieldsToReveal);
  const compressed_disclose_sel = buildKycDiscloseSelector(kycFields);

  const ofac = opts.fieldsToReveal.includes('ofac');

  const majorityAgeASCII = opts.minimumAge
    ? opts.minimumAge
        .toString()
        .padStart(3, '0')
        .split('')
        .map(x => x.charCodeAt(0))
    : ['0', '0', '0'].map(x => x.charCodeAt(0));

  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '').split('');

  const inputs: KycDiscloseInput = {
    data_padded: formatInput(msgPadded),
    compressed_disclose_sel,
    scope: opts.scope,
    merkle_root: formatInput(BigInt(opts.merkletree.root)),
    leaf_depth: formatInput(leaf_depth),
    path: formatInput(merkle_path),
    siblings: formatInput(siblings),
    forbidden_countries_list: opts.forbidden_countries_list
      ? formatInput(formatCountriesList(opts.forbidden_countries_list))
      : [...Array(120)].map(() => '0'),
    ofac_name_dob_smt_leaf_key: nameDobInputs.smt_leaf_key,
    ofac_name_dob_smt_root: nameDobInputs.smt_root,
    ofac_name_dob_smt_siblings: nameDobInputs.smt_siblings,
    ofac_name_yob_smt_leaf_key: nameYobInputs.smt_leaf_key,
    ofac_name_yob_smt_root: nameYobInputs.smt_root,
    ofac_name_yob_smt_siblings: nameYobInputs.smt_siblings,
    selector_ofac: ofac ? ['1'] : ['0'],
    user_identifier: opts.user_identifier,
    current_date: currentDate,
    majority_age_ASCII: majorityAgeASCII,
    secret,
  };

  return { inputs };
}

/**
 * Generates KYC disclose inputs from dummy data (for testing).
 * This mirrors the old `generateKycDiscloseInput` function signature from common.
 */
export function generateKycDiscloseInputFromDummy(
  ofac_input: boolean,
  nameDobSmt: SMT,
  nameYobSmt: SMT,
  identityTree: LeanIMT,
  ofac: boolean,
  scope: string,
  userIdentifier: string,
  fieldsToReveal?: KycField[],
  forbiddenCountriesList?: string[],
  minimumAge?: number,
  updateTree?: boolean,
  secret: string = '1234',
  reverse?: boolean,
): KycDiscloseInput {
  let data = ofac_input ? OFAC_DUMMY_KYC_DATA : NON_OFAC_DUMMY_KYC_DATA;
  if (reverse) {
    data = {
      ...data,
      fullName: data.fullName.split(' ').reverse().join(' '),
    };
  }

  const serializedData = serializeKycData(data).padEnd(KYC_MAX_LENGTH, '\0');
  const msgPadded = Array.from(serializedData, x => x.charCodeAt(0));

  const commitment = poseidon2([secret, packBytesAndPoseidon(msgPadded)]);

  if (updateTree) {
    identityTree.insert(commitment);
  }

  const index = findIndexInTree(identityTree, commitment);
  const {
    siblings,
    path: merkle_path,
    leaf_depth,
  } = generateMerkleProof(identityTree, index, COMMITMENT_TREE_DEPTH);

  const nameDobInputs = generateOfacProof(data, nameDobSmt, 2);
  const nameYobInputs = generateOfacProof(data, nameYobSmt, 1);

  const fieldsToRevealFinal = fieldsToReveal || [];
  const compressed_disclose_sel = buildKycDiscloseSelector(fieldsToRevealFinal);

  const majorityAgeASCII = minimumAge
    ? minimumAge
        .toString()
        .padStart(3, '0')
        .split('')
        .map(x => x.charCodeAt(0))
    : ['0', '0', '0'].map(x => x.charCodeAt(0));

  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '').split('');

  return {
    data_padded: formatInput(msgPadded),
    compressed_disclose_sel,
    scope,
    merkle_root: formatInput(BigInt(identityTree.root)),
    leaf_depth: formatInput(leaf_depth),
    path: formatInput(merkle_path),
    siblings: formatInput(siblings),
    forbidden_countries_list: forbiddenCountriesList
      ? formatInput(formatCountriesList(forbiddenCountriesList))
      : [...Array(120)].map(() => '0'),
    ofac_name_dob_smt_leaf_key: nameDobInputs.smt_leaf_key,
    ofac_name_dob_smt_root: nameDobInputs.smt_root,
    ofac_name_dob_smt_siblings: nameDobInputs.smt_siblings,
    ofac_name_yob_smt_leaf_key: nameYobInputs.smt_leaf_key,
    ofac_name_yob_smt_root: nameYobInputs.smt_root,
    ofac_name_yob_smt_siblings: nameYobInputs.smt_siblings,
    selector_ofac: ofac ? ['1'] : ['0'],
    user_identifier: userIdentifier,
    current_date: currentDate,
    majority_age_ASCII: majorityAgeASCII,
    secret,
  };
}
