import {
  PUBKEY_TREE_DEPTH,
  DEFAULT_USER_ID_TYPE,
  MAX_PADDED_ECONTENT_LEN,
  MAX_PADDED_SIGNED_ATTR_LEN,
} from '../constants/constants';
import { assert, shaPad } from './shaPad';
import { PassportData, SignatureAlgorithm } from './types';
import {
  bytesToBigDecimal,
  formatMrz,
  hash,
  splitToWords,
  getCurrentDateYYMMDD,
  generateMerkleProof,
  generateSMTProof,
  findSubarrayIndex,
  hexToDecimal,
  extractRSFromSignature,
  castFromUUID,
  castFromScope,
  parseUIDToBigInt,
  formatDg2Hash,
  getNAndK,
  stringToAsciiBigIntArray,
  formatCountriesList,
} from './utils';
import { generateCommitment, getLeaf } from './pubkeyTree';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { getCountryLeaf, getNameLeaf, getNameDobLeaf, getPassportNumberLeaf } from './smtTree';
import { packBytes } from '../utils/utils';
import { SMT } from '@openpassport/zk-kit-smt';
import { parseCertificateSimple } from './certificate_parsing/parseCertificateSimple';
import { PublicKeyDetailsECDSA, PublicKeyDetailsRSA } from './certificate_parsing/dataStructure';

export function generateCircuitInputsDisclose(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  scope: string,
  selector_dg1: string[],
  selector_older_than: string | number,
  merkletree: LeanIMT,
  majority: string,
  name_smt: SMT,
  selector_ofac: string | number,
  forbidden_countries_list: string[],
  user_identifier: string
) {
  const pubkey_leaf = getLeaf(passportData.dsc);
  const formattedMrz = formatMrz(passportData.mrz);
  const mrz_bytes_packed = packBytes(formattedMrz);

  const commitment = generateCommitment(
    BigInt(secret).toString(),
    BigInt(attestation_id).toString(),
    BigInt(pubkey_leaf).toString(),
    mrz_bytes_packed,
    formatDg2Hash(passportData.dg2Hash)
  );
  console.log('\x1b[90mcommitment:\x1b[0m', commitment);

  const index = findIndexInTree(merkletree, commitment);

  const { merkleProofSiblings, merkleProofIndices, depthForThisOne } = generateMerkleProof(
    merkletree,
    index,
    PUBKEY_TREE_DEPTH
  );
  const formattedMajority = majority.length === 1 ? `0${majority}` : majority;
  const majority_ascii = formattedMajority.split('').map((char) => char.charCodeAt(0));

  // SMT -  OFAC

  const name_leaf = getNameLeaf(formattedMrz.slice(10, 49)); // [6-44] + 5 shift
  const {
    root: smt_root,
    closestleaf: smt_leaf_value,
    siblings: smt_siblings,
  } = generateSMTProof(name_smt, name_leaf);

  return {
    secret: formatInput(secret),
    attestation_id: formatInput(attestation_id),
    pubkey_leaf: formatInput(pubkey_leaf),
    dg1: formatInput(formattedMrz),
    dg2_hash: formatInput(formatDg2Hash(passportData.dg2Hash)),
    merkle_root: formatInput(merkletree.root),
    merkletree_size: formatInput(depthForThisOne),
    path: formatInput(merkleProofIndices),
    siblings: formatInput(merkleProofSiblings),
    selector_dg1: formatInput(selector_dg1),
    selector_older_than: formatInput(selector_older_than),
    scope: formatInput(castFromScope(scope)),
    current_date: formatInput(getCurrentDateYYMMDD()),
    majority: formatInput(majority_ascii),
    user_identifier: formatInput(castFromUUID(user_identifier)),
    smt_root: formatInput(smt_root),
    smt_leaf_value: formatInput(smt_leaf_value),
    smt_siblings: formatInput(smt_siblings),
    selector_ofac: formatInput(selector_ofac),
    forbidden_countries_list: formatInput(formatCountriesList(forbidden_countries_list)),
  };
}

export function generateCircuitInputsOfac(
  passportData: PassportData,
  sparsemerkletree: SMT,
  proofLevel: number
) {
  const mrz_bytes = formatMrz(passportData.mrz);
  const passport_leaf = getPassportNumberLeaf(mrz_bytes.slice(49, 58));
  const namedob_leaf = getNameDobLeaf(mrz_bytes.slice(10, 49), mrz_bytes.slice(62, 68)); // [57-62] + 5 shift
  const name_leaf = getNameLeaf(mrz_bytes.slice(10, 49)); // [6-44] + 5 shift

  let root, closestleaf, siblings;
  if (proofLevel == 3) {
    ({ root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, passport_leaf));
  } else if (proofLevel == 2) {
    ({ root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, namedob_leaf));
  } else if (proofLevel == 1) {
    ({ root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, name_leaf));
  } else {
    throw new Error('Invalid proof level');
  }

  return {
    dg1: formatInput(mrz_bytes),
    smt_leaf_value: formatInput(closestleaf),
    smt_root: formatInput(root),
    smt_siblings: formatInput(siblings),
  };
}

export function generateCircuitInputsCountryVerifier(
  passportData: PassportData,
  sparsemerkletree: SMT
) {
  const mrz_bytes = formatMrz(passportData.mrz);
  const usa_ascii = stringToAsciiBigIntArray('USA');
  const country_leaf = getCountryLeaf(usa_ascii, mrz_bytes.slice(7, 10));
  const { root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, country_leaf);

  return {
    dg1: formatInput(mrz_bytes),
    hostCountry: formatInput(usa_ascii),
    smt_leaf_value: formatInput(closestleaf),
    smt_root: formatInput(root),
    smt_siblings: formatInput(siblings),
  };
}

// this get the commitment index whether it is a string or a bigint
// this is necessary rn because when the tree is send from the server in a serialized form,
// the bigints are converted to strings and I can't figure out how to use tree.import to load bigints there
export function findIndexInTree(tree: LeanIMT, commitment: bigint): number {
  let index = tree.indexOf(commitment);
  if (index === -1) {
    index = tree.indexOf(commitment.toString() as unknown as bigint);
  }
  if (index === -1) {
    throw new Error('This commitment was not found in the tree');
  } else {
    //  console.log(`Index of commitment in the registry: ${index}`);
  }
  return index;
}

export function generateCircuitInputsProve(
  selector_mode: number[] | string[],
  secret: number | string,
  dsc_secret: number | string,
  passportData: PassportData,
  scope: string,
  selector_dg1: string[],
  selector_older_than: string | number,
  majority: string,
  name_smt: SMT,
  selector_ofac: string | number,
  forbidden_countries_list: string[],
  user_identifier: string,
  user_identifier_type: 'uuid' | 'hex' | 'ascii' = DEFAULT_USER_ID_TYPE
) {
  const { mrz, eContent, signedAttr, encryptedDigest, dsc, dg2Hash } = passportData;
  const { signatureAlgorithm, hashAlgorithm, publicKeyDetails } = parseCertificateSimple(passportData.dsc);
  let pubKey: any;
  let signature: any;
  let signatureAlgorithmFullName: string;
  let n, k;
  // const 


  // const { n, k } = getNAndK(`${signatureAlgorithm}_${hashFunction}_${curve || exponent}_${bits}` as any);

  if (signatureAlgorithm === 'ecdsa') {
    signatureAlgorithmFullName = `${signatureAlgorithm}_${hashAlgorithm}_${(publicKeyDetails as PublicKeyDetailsECDSA).curve}_${publicKeyDetails.bits}`;
    ({ n, k } = getNAndK(signatureAlgorithmFullName as SignatureAlgorithm));
    const { x, y } = publicKeyDetails as PublicKeyDetailsECDSA;
    const { r, s } = extractRSFromSignature(encryptedDigest);
    const signature_r = splitToWords(BigInt(hexToDecimal(r)), n, k);
    const signature_s = splitToWords(BigInt(hexToDecimal(s)), n, k);
    signature = [...signature_r, ...signature_s];
    const dsc_modulus_x = splitToWords(BigInt(hexToDecimal(x)), n, k);
    const dsc_modulus_y = splitToWords(BigInt(hexToDecimal(y)), n, k);
    pubKey = [...dsc_modulus_x, ...dsc_modulus_y];
  } else {
    const modulus = (publicKeyDetails as PublicKeyDetailsRSA).modulus;
    signatureAlgorithmFullName = `${signatureAlgorithm}_${hashAlgorithm}_${modulus}_${publicKeyDetails.bits}`;
    ({ n, k } = getNAndK(signatureAlgorithmFullName as SignatureAlgorithm));
    signature = splitToWords(BigInt(bytesToBigDecimal(encryptedDigest)), n, k);
    pubKey = splitToWords(BigInt(hexToDecimal(modulus)), n, k);
  }

  console.log('signatureAlgorithmFullName', signatureAlgorithmFullName);

  const formattedMrz = formatMrz(mrz);
  const dg1Hash = hash(hashAlgorithm, formattedMrz);
  const dg1HashOffset = findSubarrayIndex(eContent, dg1Hash);
  console.log('\x1b[90m%s\x1b[0m', 'dg1HashOffset', dg1HashOffset);
  assert(dg1HashOffset !== -1, `DG1 hash ${dg1Hash} not found in eContent`);

  const eContentHash = hash(hashAlgorithm, eContent);
  const eContentHashOffset = findSubarrayIndex(signedAttr, eContentHash);
  console.log('\x1b[90m%s\x1b[0m', 'eContentHashOffset', eContentHashOffset);
  assert(eContentHashOffset !== -1, `eContent hash ${eContentHash} not found in signedAttr`);

  if (eContent.length > MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]) {
    console.error(
      `Data hashes too long (${eContent.length} bytes). Max length is ${MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]} bytes.`
    );
    throw new Error(
      `This length of datagroups (${eContent.length} bytes) is currently unsupported. Please contact us so we add support!`
    );
  }

  const [eContentPadded, eContentLen] = shaPad(
    new Uint8Array(eContent),
    MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]
  );

  const [signedAttrPadded, signedAttrPaddedLen] = shaPad(
    new Uint8Array(signedAttr),
    MAX_PADDED_SIGNED_ATTR_LEN[signatureAlgorithmFullName]
  );

  const formattedMajority = majority.length === 1 ? `0${majority}` : majority;
  const majority_ascii = formattedMajority.split('').map((char) => char.charCodeAt(0));

  // SMT -  OFAC
  const mrz_bytes = formatMrz(passportData.mrz);
  const name_leaf = getNameLeaf(mrz_bytes.slice(10, 49)); // [6-44] + 5 shift
  const {
    root: smt_root,
    closestleaf: smt_leaf_value,
    siblings: smt_siblings,
  } = generateSMTProof(name_smt, name_leaf);


  return {
    selector_mode: formatInput(selector_mode),
    dg1: formatInput(formattedMrz),
    dg1_hash_offset: formatInput(dg1HashOffset),
    dg2_hash: formatInput(formatDg2Hash(dg2Hash)),
    eContent: Array.from(eContentPadded).map((x) => x.toString()),
    eContent_padded_length: formatInput(eContentLen),
    signed_attr: Array.from(signedAttrPadded).map((x) => x.toString()),
    signed_attr_padded_length: formatInput(signedAttrPaddedLen),
    signed_attr_econtent_hash_offset: formatInput(eContentHashOffset),
    signature: signature,
    pubKey: pubKey,
    current_date: formatInput(getCurrentDateYYMMDD()),
    selector_dg1: formatInput(selector_dg1),
    selector_older_than: formatInput(selector_older_than),
    majority: formatInput(majority_ascii),
    user_identifier: formatInput(parseUIDToBigInt(user_identifier, user_identifier_type)),
    scope: formatInput(castFromScope(scope)),
    secret: formatInput(secret),
    dsc_secret: formatInput(dsc_secret),
    smt_root: formatInput(smt_root),
    smt_leaf_value: formatInput(smt_leaf_value),
    smt_siblings: formatInput(smt_siblings),
    selector_ofac: formatInput(selector_ofac),
    forbidden_countries_list: formatInput(formatCountriesList(forbidden_countries_list))
  };
}

export function formatInput(input: any) {
  if (Array.isArray(input)) {
    return input.map((item) => BigInt(item).toString());
  } else {
    return [BigInt(input).toString()];
  }
}
