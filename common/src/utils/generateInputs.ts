import { MAX_DATAHASHES_LEN, PUBKEY_TREE_DEPTH, DEVELOPMENT_MODE } from '../constants/constants';
import { assert, shaPad } from './shaPad';
import { PassportData } from './types';
import {
  arraysAreEqual,
  bytesToBigDecimal,
  formatMrz,
  hash,
  splitToWords,
  toUnsignedByte,
  getHashLen,
  getCurrentDateYYMMDD,
  generateMerkleProof,
  generateSMTProof,
  findSubarrayIndex,
  hexToDecimal,
  BigintToArray,
  extractRSFromSignature,
} from './utils';
import { LeanIMT } from "@zk-kit/lean-imt";
import { getLeaf } from "./pubkeyTree";
import { getNameLeaf, getNameDobLeaf, getPassportNumberLeaf } from "./ofacTree";
import { poseidon6 } from "poseidon-lite";
import { packBytes } from "../utils/utils";
import { getCSCAModulusMerkleTree } from "./csca";
import {
  mockPassportDatas,
} from "../constants/mockPassportData";
import { SMT } from "@ashpect/smt"

export function generateCircuitInputsRegister(
  secret: string,
  dscSecret: string,
  attestation_id: string,
  passportData: PassportData,
  n_dsc: number,
  k_dsc: number,
  mocks: PassportData[] = mockPassportDatas
) {
  const { mrz, signatureAlgorithm, pubKey, dataGroupHashes, eContent, encryptedDigest } =
    passportData;

  // const tree = getCSCAModulusMerkleTree();

  // if (DEVELOPMENT_MODE) {
  //   for (const mockPassportData of mocks) {
  //     tree.insert(getLeaf(mockPassportData).toString());
  //   }
  // }

  if (
    ![
      'sha256WithRSAEncryption',
      'sha1WithRSAEncryption',
      'sha256WithRSASSAPSS',
      'ecdsa-with-SHA1',
      'ecdsa-with-SHA256',
    ].includes(signatureAlgorithm)
  ) {
    console.error(`${signatureAlgorithm} has not been implemented.`);
    throw new Error(`${signatureAlgorithm} has not been implemented.`);
  }

  const hashLen = getHashLen(signatureAlgorithm);
  const formattedMrz = formatMrz(mrz);
  const mrzHash = hash(signatureAlgorithm, formattedMrz);

  const dg1HashOffset = findSubarrayIndex(dataGroupHashes, mrzHash);
  console.log('dg1HashOffset', dg1HashOffset);

  assert(dg1HashOffset !== -1, 'MRZ hash index not found in dataGroupHashes');

  const concatHash = hash(signatureAlgorithm, dataGroupHashes);

  assert(
    arraysAreEqual(concatHash, eContent.slice(eContent.length - hashLen)),
    'concatHash is not at the right place in eContent'
  );

  const leaf = getLeaf({
    signatureAlgorithm: signatureAlgorithm,
    ...pubKey,
  }).toString();

  // const index = tree.indexOf(leaf);
  // console.log(`Index of pubkey in the registry: ${index}`);
  // if (index === -1) {
  //   throw new Error('Your public key was not found in the registry');
  // }

  // const proof = tree.createProof(index);
  // console.log('verifyProof', tree.verifyProof(proof));

  if (dataGroupHashes.length > MAX_DATAHASHES_LEN) {
    throw new Error(
      `This length of datagroups (${dataGroupHashes.length} bytes) is currently unsupported. Please contact us so we add support!`
    );
  }

  const [messagePadded, messagePaddedLen] = shaPad(
    signatureAlgorithm,
    new Uint8Array(dataGroupHashes),
    MAX_DATAHASHES_LEN
  );

  let dsc_modulus: any;
  let signature: any;

  if (
    signatureAlgorithm === 'ecdsa-with-SHA1' ||
    signatureAlgorithm === 'ecdsa-with-SHA256' ||
    signatureAlgorithm === 'ecdsa-with-SHA512' ||
    signatureAlgorithm === 'ecdsa-with-SHA384'
  ) {
    const curve_params = pubKey.publicKeyQ.replace(/[()]/g, '').split(',');
    const qx = BigInt(hexToDecimal(curve_params[0]));
    const qy = BigInt(hexToDecimal(curve_params[1]));
    dsc_modulus = [BigintToArray(n_dsc, k_dsc, qx), BigintToArray(n_dsc, k_dsc, qy)];

    const { r, s } = extractRSFromSignature(passportData.encryptedDigest);
    signature = [
      BigintToArray(n_dsc, k_dsc, BigInt(hexToDecimal(r))),
      BigintToArray(n_dsc, k_dsc, BigInt(hexToDecimal(s)))
    ];
  } else {
    dsc_modulus = splitToWords(
      BigInt(passportData.pubKey.modulus as string),
      BigInt(n_dsc),
      BigInt(k_dsc)
    );
    signature = splitToWords(
      BigInt(bytesToBigDecimal(passportData.encryptedDigest)),
      BigInt(n_dsc),
      BigInt(k_dsc)
    );
  }
  return {
    secret: [secret],
    mrz: formattedMrz.map((byte) => String(byte)),
    dg1_hash_offset: [dg1HashOffset.toString()],
    dataHashes: Array.from(messagePadded).map((x) => x.toString()),
    datahashes_padded_length: [messagePaddedLen.toString()],
    eContent: eContent.map(toUnsignedByte).map((byte) => String(byte)),
    signature: signature,
    dsc_modulus: dsc_modulus,
    attestation_id: [attestation_id],
    dsc_secret: [dscSecret],
  };
}

export function generateCircuitInputsDisclose(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  merkletree: LeanIMT,
  majority: string,
  bitmap: string[],
  scope: string,
  user_identifier: string
) {
  const pubkey_leaf = getLeaf({
    signatureAlgorithm: passportData.signatureAlgorithm,
    modulus: passportData.pubKey.modulus,
    exponent: passportData.pubKey.exponent,
  });

  const formattedMrz = formatMrz(passportData.mrz);
  const mrz_bytes = packBytes(formattedMrz);
  const commitment = poseidon6([
    secret,
    attestation_id,
    pubkey_leaf,
    mrz_bytes[0],
    mrz_bytes[1],
    mrz_bytes[2],
  ]);

  //console.log('commitment', commitment.toString());

  const index = findIndexInTree(merkletree, commitment);

  const { merkleProofSiblings, merkleProofIndices, depthForThisOne } = generateMerkleProof(
    merkletree,
    index,
    PUBKEY_TREE_DEPTH
  );

  // format majority to bigints


  return {
    secret: [secret],
    attestation_id: [attestation_id],
    pubkey_leaf: [pubkey_leaf.toString()],
    mrz: formattedMrz.map((byte) => String(byte)),
    merkle_root: [merkletree.root.toString()],
    merkletree_size: [BigInt(depthForThisOne).toString()],
    path: merkleProofIndices.map((index) => BigInt(index).toString()),
    siblings: merkleProofSiblings.map((index) => BigInt(index).toString()),
    bitmap: bitmap,
    scope: [BigInt(scope).toString()],
    current_date: getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString()),
    majority: majority.split('').map(char => BigInt(char.charCodeAt(0)).toString()),
    user_identifier: [user_identifier],
  };
}

export function generateCircuitInputsOfac(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  merkletree: LeanIMT,
  majority: string,
  bitmap: string[],
  scope: string,
  user_identifier: string,
  sparsemerkletree: SMT,
  proofLevel: number,
) {

  const result = generateCircuitInputsDisclose(secret, attestation_id, passportData, merkletree, majority, bitmap, scope, user_identifier);
  const { majority: _, scope: __, bitmap: ___, user_identifier: ____, ...finalResult } = result;

  const mrz_bytes = formatMrz(passportData.mrz);
  const passport_leaf = getPassportNumberLeaf(mrz_bytes.slice(49, 58))
  const namedob_leaf = getNameDobLeaf(mrz_bytes.slice(10, 49), mrz_bytes.slice(62, 68)) // [57-62] + 5 shift
  const name_leaf = getNameLeaf(mrz_bytes.slice(10, 49)) // [6-44] + 5 shift

  let root, closestleaf, siblings;
  if (proofLevel == 3) {
    ({ root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, passport_leaf));
  } else if (proofLevel == 2) {
    ({ root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, namedob_leaf));
  } else if (proofLevel == 1) {
    ({ root, closestleaf, siblings } = generateSMTProof(sparsemerkletree, name_leaf));
  } else {
    throw new Error("Invalid proof level")
  }

  return {
    ...finalResult,
    closest_leaf: [BigInt(closestleaf).toString()],
    smt_root: [BigInt(root).toString()],
    smt_siblings: siblings.map(index => BigInt(index).toString()),
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
  passportData: PassportData,
  n_dsc: number,
  k_dsc: number,
  scope: string,
  bitmap: string[],
  majority: string,
  user_identifier: string,
) {

  const register_inputs = generateCircuitInputsRegister('0', '0', '0', passportData, n_dsc, k_dsc);
  const current_date = getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString());
  // Ensure majority is at least two digits
  const formattedMajority = majority.length === 1 ? `0${majority}` : majority;
  return {
    mrz: register_inputs.mrz,
    dg1_hash_offset: register_inputs.dg1_hash_offset, // uncomment when adding new circuits
    dataHashes: register_inputs.dataHashes,
    datahashes_padded_length: register_inputs.datahashes_padded_length,
    eContent: register_inputs.eContent,
    signature: register_inputs.signature,
    dsc_modulus: register_inputs.dsc_modulus,
    current_date: current_date,
    bitmap: bitmap,
    majority: formattedMajority.split('').map(char => BigInt(char.charCodeAt(0)).toString()),
    user_identifier: [user_identifier],
    scope: [BigInt(scope).toString()]
  };

}