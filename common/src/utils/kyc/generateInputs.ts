import { poseidon2 } from 'poseidon-lite';

import { COMMITMENT_TREE_DEPTH } from '../../constants/constants.js';
import { formatCountriesList } from '../circuits/formatInputs.js';
import { findIndexInTree, formatInput } from '../circuits/generateInputs.js';
import { packBytesAndPoseidon } from '../hash.js';
import {
  generateMerkleProof,
  generateSMTProof,
  getNameDobLeafKyc,
  getNameYobLeafKyc,
} from '../trees.js';
import { deserializeApplicantInfo, deserializeSignature } from './api.js';
import { createKycSelector, KYC_MAX_LENGTH, KycField } from './constants.js';
import { signEdDSA } from './ecdsa/ecdsa.js';
import { KycData, KycDiscloseInput, KycRegisterInput, serializeKycData } from './types.js';

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { Base8, inCurve, mulPointEscalar, subOrder } from '@zk-kit/baby-jubjub';

export const NON_OFAC_DUMMY_INPUT: KycData = {
  country: 'KEN',
  idType: 'NATIONAL ID',
  idNumber: '12345678901234567890123456789012', //32 digits
  issuanceDate: '20200101',
  expiryDate: '20290101',
  fullName: 'John Doe',
  dob: '19900101',
  photoHash: '1234567890',
  phoneNumber: '1234567890',
  gender: 'M',
  address: '1234567890',
  user_identifier: '1234567890',
  current_date: '20250101',
  majority_age_ASCII: '20',
  selector_older_than: '1',
};

export const OFAC_DUMMY_INPUT: KycData = {
  country: 'KEN',
  idType: 'NATIONAL ID',
  idNumber: '12345678901234567890123456789012', //32 digits
  issuanceDate: '20200101',
  expiryDate: '20290101',
  fullName: 'ABBAS ABU',
  dob: '19481210',
  photoHash: '1234567890',
  phoneNumber: '1234567890',
  gender: 'M',
  address: '1234567890',
  user_identifier: '1234567890',
  current_date: '20250101',
  majority_age_ASCII: '20',
  selector_older_than: '1',
};

export const createKycDiscloseSelFromFields = (fieldsToReveal: KycField[]): string[] => {
  const [lowResult, highResult] = createKycSelector(fieldsToReveal);
  return [lowResult.toString(), highResult.toString()];
};

export const generateCircuitInputsOfac = (data: KycData, smt: SMT, proofLevel: number) => {
  const name = data.fullName;
  const dob = data.dob;
  const yob = data.dob.slice(0, 4);

  const nameDobLeaf = getNameDobLeafKyc(name, dob);
  const nameYobLeaf = getNameYobLeafKyc(name, yob);

  let root, closestleaf, siblings;
  if (proofLevel == 2) {
    ({ root, closestleaf, siblings } = generateSMTProof(smt, nameDobLeaf));
  } else if (proofLevel == 1) {
    ({ root, closestleaf, siblings } = generateSMTProof(smt, nameYobLeaf));
  } else {
    throw new Error('Invalid proof level');
  }

  return {
    smt_root: formatInput(root),
    smt_leaf_key: formatInput(closestleaf),
    smt_siblings: formatInput(siblings),
  };
};

export const generateKycDiscloseInput = (
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
  reverse?: boolean
) => {
  let data = ofac_input ? OFAC_DUMMY_INPUT : NON_OFAC_DUMMY_INPUT;
  if (reverse) {
    data = {
      ...data,
      fullName: data.fullName.split(' ').reverse().join(' '),
    };
  }
  const serializedData = serializeKycData(data).padEnd(KYC_MAX_LENGTH, '\0');
  const msgPadded = Array.from(serializedData, (x) => x.charCodeAt(0));
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

  const nameDobInputs = generateCircuitInputsOfac(data, nameDobSmt, 2);
  const nameYobInputs = generateCircuitInputsOfac(data, nameYobSmt, 1);

  const fieldsToRevealFinal = fieldsToReveal || [];
  const compressed_disclose_sel = createKycDiscloseSelFromFields(fieldsToRevealFinal);

  const majorityAgeASCII = minimumAge
    ? minimumAge
        .toString()
        .padStart(3, '0')
        .split('')
        .map((x) => x.charCodeAt(0))
    : ['0', '0', '0'].map((x) => x.charCodeAt(0));

  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '').split('');

  const circuitInput: KycDiscloseInput = {
    data_padded: formatInput(msgPadded),
    compressed_disclose_sel: compressed_disclose_sel,
    scope: scope,
    merkle_root: formatInput(BigInt(identityTree.root)),
    leaf_depth: formatInput(leaf_depth),
    path: formatInput(merkle_path),
    siblings: formatInput(siblings),
    forbidden_countries_list: forbiddenCountriesList
      ? formatInput(formatCountriesList(forbiddenCountriesList))
      : [...Array(120)].map((x) => '0'),
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
    secret: secret,
  };

  return circuitInput;
};

export const generateKycDiscloseInputFromData = (
  serializedApplicantInfo: string,
  secret: string,
  nameDobSmt: SMT,
  nameYobSmt: SMT,
  identityTree: LeanIMT,
  ofac: boolean,
  scope: string,
  userIdentifier: string,
  fieldsToReveal?: KycField[],
  forbiddenCountriesList?: string[],
  minimumAge?: number
): KycDiscloseInput => {
  // Decode base64 applicant info to get raw padded bytes for the circuit
  const rawData = Buffer.from(serializedApplicantInfo, 'base64').toString('utf-8');
  const serializedData = rawData.padEnd(KYC_MAX_LENGTH, '\0');
  const msgPadded = Array.from(serializedData, (x) => x.charCodeAt(0));

  // Compute commitment
  const commitment = poseidon2([secret, packBytesAndPoseidon(msgPadded)]);

  // Find in tree and generate merkle proof
  const index = findIndexInTree(identityTree, commitment);
  const {
    siblings,
    path: merkle_path,
    leaf_depth,
  } = generateMerkleProof(identityTree, index, COMMITMENT_TREE_DEPTH);

  // Deserialize to get individual fields for OFAC lookups
  const applicantData = deserializeApplicantInfo(serializedApplicantInfo);
  const ofacData = {
    ...applicantData,
    user_identifier: '',
    current_date: '',
    majority_age_ASCII: '',
    selector_older_than: '',
  } as KycData;
  const nameDobInputs = generateCircuitInputsOfac(ofacData, nameDobSmt, 2);
  const nameYobInputs = generateCircuitInputsOfac(ofacData, nameYobSmt, 1);

  // Build disclosure selector
  const fieldsToRevealFinal = fieldsToReveal || [];
  const compressed_disclose_sel = createKycDiscloseSelFromFields(fieldsToRevealFinal);

  // Age and date
  const majorityAgeASCII = minimumAge
    ? minimumAge
        .toString()
        .padStart(3, '0')
        .split('')
        .map((x) => x.charCodeAt(0))
    : ['0', '0', '0'].map((x) => x.charCodeAt(0));

  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '').split('');

  const circuitInput: KycDiscloseInput = {
    data_padded: formatInput(msgPadded),
    compressed_disclose_sel: compressed_disclose_sel,
    scope: scope,
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
    secret: secret,
  };

  return circuitInput;
};

export const generateKycRegisterInput = async (
  applicantInfoBase64: string,
  signatureBase64: string,
  pubkeyStr: [string, string],
  secret: string
) => {
  const signature = deserializeSignature(signatureBase64);
  const pubkey = [BigInt(pubkeyStr[0]), BigInt(pubkeyStr[1])] as [bigint, bigint];

  // Use raw bytes directly — deserialize→reserialize strips the namespace prefix
  // from id_type, producing different bytes than the TEE signed.
  const raw = Buffer.from(applicantInfoBase64, 'base64');
  const dataPadded = [
    ...Array.from(raw, (b) => Number(b)),
    ...new Array(Math.max(0, KYC_MAX_LENGTH - raw.length)).fill(0),
  ];

  const kycRegisterInput: KycRegisterInput = {
    data_padded: dataPadded,
    s: signature.s,
    R: signature.R,
    pubKey: pubkey,
    secret,
  };

  return kycRegisterInput;
};

export const generateMockKycRegisterInput = async (
  secretKey?: bigint,
  ofac?: boolean,
  secret?: string
) => {
  const kycData = ofac ? OFAC_DUMMY_INPUT : NON_OFAC_DUMMY_INPUT;
  const serializedData = serializeKycData(kycData).padEnd(KYC_MAX_LENGTH, '\0');

  const msgPadded = Array.from(serializedData, (x) => x.charCodeAt(0));

  const sk = secretKey ? secretKey : BigInt(Math.floor(Math.random() * Number(subOrder - 2n))) + 1n;

  const pk = mulPointEscalar(Base8, sk);
  console.assert(inCurve(pk), 'Point pk not on curve');
  console.assert(pk[0] != 0n && pk[1] != 0n, 'pk is zero');

  const [sig, pubKey] = signEdDSA(sk, msgPadded);
  console.assert(BigInt(sig.S) < subOrder, ' s is greater than scalar field');

  const kycRegisterInput: KycRegisterInput = {
    data_padded: msgPadded.map((x) => Number(x)),
    s: BigInt(sig.S),
    R: sig.R8 as [bigint, bigint],
    pubKey,
    secret: secret || '1234',
  };

  return kycRegisterInput;
};
