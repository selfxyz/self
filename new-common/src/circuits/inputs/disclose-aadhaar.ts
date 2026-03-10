import { poseidon5 } from 'poseidon-lite';
import type { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import type { SMT } from '@openpassport/zk-kit-smt';

import { processQRData } from '../../documents/aadhaar/qr.js';
import { stringToAsciiArray, getCurrentDate } from '../../documents/aadhaar/utils.js';
import { packBytesAndPoseidon } from '../../crypto/hash/poseidon.js';
import { disclosureToAadhaarSelector } from '../../documents/aadhaar/constants.js';
import type { DisclosureField } from '../../documents/interface.js';
import { COMMITMENT_TREE_DEPTH } from '../../foundation/constants/circuit.js';
import { generateMerkleProof, generateSMTProof } from '../../trees/proof.js';
import { getNameDobLeafAadhaar, getNameYobLeafAadhaar } from '../../trees/aadhaarLeafBuilder.js';
import { findIndexInTree } from './disclose.js';
import { formatInput, formatCountriesList } from './format.js';

export interface AadhaarDiscloseInputOpts {
  merkletree: LeanIMT;
  nameAndDob_smt: SMT;
  nameAndYob_smt: SMT;
  scope: string;
  fieldsToReveal: DisclosureField[];
  user_identifier: string;
  minimumAge: number;
  forbidden_countries_list?: string[];
  updateTree?: boolean;
}

function computeNullifier(fields: {
  gender: string;
  yob: string;
  mob: string;
  dob: string;
  name: string;
  aadhaarLast4Digits: string;
}): bigint {
  const genderAscii = stringToAsciiArray(fields.gender)[0];
  const args = [
    genderAscii,
    ...stringToAsciiArray(fields.yob),
    ...stringToAsciiArray(fields.mob),
    ...stringToAsciiArray(fields.dob),
    ...stringToAsciiArray(fields.name.toUpperCase().padEnd(62, '\0')),
    ...stringToAsciiArray(fields.aadhaarLast4Digits),
  ];
  return BigInt(packBytesAndPoseidon(args));
}

function computePackedCommitment(fields: {
  pincode: string;
  state: string;
  phoneNoLast4Digits: string;
  name: string;
}): bigint {
  const args = [
    3,
    ...stringToAsciiArray(fields.pincode),
    ...stringToAsciiArray(fields.state.padEnd(31, '\0')),
    ...stringToAsciiArray(fields.phoneNoLast4Digits),
    ...stringToAsciiArray(fields.name.padEnd(62, '\0')),
  ];
  return BigInt(packBytesAndPoseidon(args));
}

export function generateAadhaarDiscloseInputs(
  qrData: string,
  secret: string,
  opts: AadhaarDiscloseInputOpts,
) {
  const processed = processQRData(qrData);
  const { extractedFields } = processed;

  const { currentYear, currentMonth, currentDay } = getCurrentDate();

  const genderAscii = stringToAsciiArray(extractedFields.gender)[0];
  const nullifier = computeNullifier(extractedFields);
  const packedCommitment = computePackedCommitment(extractedFields);
  const commitment = poseidon5([
    BigInt(secret),
    processed.qrHash,
    nullifier,
    packedCommitment,
    processed.photoHash,
  ]);

  const paddedName = extractedFields.name
    .padEnd(62, '\0')
    .split('')
    .map(c => c.charCodeAt(0));

  if (opts.updateTree) {
    opts.merkletree.insert(BigInt(commitment));
  }

  const index = findIndexInTree(opts.merkletree, BigInt(commitment));
  const {
    siblings,
    path: merkle_path,
    leaf_depth,
  } = generateMerkleProof(opts.merkletree, index, COMMITMENT_TREE_DEPTH);

  const namedob_leaf = getNameDobLeafAadhaar(
    extractedFields.name,
    extractedFields.yob,
    extractedFields.mob,
    extractedFields.dob,
  );
  const nameyob_leaf = getNameYobLeafAadhaar(extractedFields.name, extractedFields.yob);

  const {
    root: ofac_name_dob_smt_root,
    closestleaf: ofac_name_dob_smt_leaf_key,
    siblings: ofac_name_dob_smt_siblings,
  } = generateSMTProof(opts.nameAndDob_smt, namedob_leaf);

  const {
    root: ofac_name_yob_smt_root,
    closestleaf: ofac_name_yob_smt_leaf_key,
    siblings: ofac_name_yob_smt_siblings,
  } = generateSMTProof(opts.nameAndYob_smt, nameyob_leaf);

  const inputs = {
    attestation_id: '3',
    secret,
    qrDataHash: formatInput(BigInt(processed.qrHash)),
    gender: formatInput(genderAscii),
    yob: stringToAsciiArray(extractedFields.yob),
    mob: stringToAsciiArray(extractedFields.mob),
    dob: stringToAsciiArray(extractedFields.dob),
    name: formatInput(paddedName),
    aadhaar_last_4digits: stringToAsciiArray(extractedFields.aadhaarLast4Digits),
    pincode: stringToAsciiArray(extractedFields.pincode),
    state: stringToAsciiArray(extractedFields.state.padEnd(31, '\0')),
    ph_no_last_4digits: stringToAsciiArray(extractedFields.phoneNoLast4Digits),
    photoHash: formatInput(BigInt(processed.photoHash)),
    merkle_root: formatInput(BigInt(opts.merkletree.root)),
    leaf_depth: formatInput(leaf_depth),
    path: formatInput(merkle_path),
    siblings: formatInput(siblings),
    ofac_name_dob_smt_leaf_key: formatInput(BigInt(ofac_name_dob_smt_leaf_key)),
    ofac_name_dob_smt_root: formatInput(BigInt(ofac_name_dob_smt_root)),
    ofac_name_dob_smt_siblings: formatInput(ofac_name_dob_smt_siblings),
    ofac_name_yob_smt_leaf_key: formatInput(BigInt(ofac_name_yob_smt_leaf_key)),
    ofac_name_yob_smt_root: formatInput(BigInt(ofac_name_yob_smt_root)),
    ofac_name_yob_smt_siblings: formatInput(ofac_name_yob_smt_siblings),
    selector: formatInput(disclosureToAadhaarSelector(opts.fieldsToReveal))[0],
    minimumAge: formatInput(opts.minimumAge),
    currentYear: formatInput(currentYear),
    currentMonth: formatInput(currentMonth),
    currentDay: formatInput(currentDay),
    scope: formatInput(BigInt(opts.scope)),
    user_identifier: formatInput(BigInt(opts.user_identifier)),
    forbidden_countries_list: opts.forbidden_countries_list
      ? formatInput(formatCountriesList(opts.forbidden_countries_list))
      : [...Array(120)].map(() => '0'),
  };

  return { inputs, nullifier, commitment };
}
