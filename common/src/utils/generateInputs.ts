import { MAX_DATAHASHES_LEN, PUBKEY_TREE_DEPTH, DEVELOPMENT_MODE, DEFAULT_USER_ID_TYPE, MAX_PADDED_ECONTENT_LEN, MAX_PADDED_SIGNED_ATTR_LEN } from '../constants/constants';
import { assert, shaPad } from './shaPad';
import { PassportData } from './types';
import {
  arraysAreEqual,
  bytesToBigDecimal,
  formatMrz,
  hash,
  splitToWords,
  toUnsignedByte,
  getCurrentDateYYMMDD,
  generateMerkleProof,
  generateSMTProof,
  findSubarrayIndex,
  hexToDecimal,
  extractRSFromSignature,
  castFromUUID,
  castFromScope,
  parseUIDToBigInt,
} from './utils';
import { LeanIMT } from "@zk-kit/lean-imt";
import { getLeaf } from "./pubkeyTree";
import { getNameLeaf, getNameDobLeaf, getPassportNumberLeaf } from "./ofacTree";
import { poseidon6 } from "poseidon-lite";
import { packBytes } from "../utils/utils";
import { getCSCAModulusMerkleTree } from "./csca";
import { SMT } from "@ashpect/smt"
import { parseCertificate } from './certificates/handleCertificate';


export function generateCircuitInputsRegister(
  secret: string,
  dscSecret: string,
  attestation_id: string,
  passportData: PassportData,
  n_dsc: number,
  k_dsc: number
) {
  const { mrz, eContent, signedAttr, encryptedDigest, dsc } = passportData;
  const { signatureAlgorithm, hashFunction, hashLen, x, y, modulus } = parseCertificate(passportData.dsc);




  let pubKey: any;
  let signature: any;

  if (signatureAlgorithm === 'ecdsa') {
    const { r, s } = extractRSFromSignature(encryptedDigest);

    const signature_r = splitToWords(BigInt(hexToDecimal(r)), n_dsc, k_dsc)
    const signature_s = splitToWords(BigInt(hexToDecimal(s)), n_dsc, k_dsc)

    signature = [...signature_r, ...signature_s]
    const dsc_modulus_x = splitToWords(BigInt(hexToDecimal(x)), n_dsc, k_dsc)
    const dsc_modulus_y = splitToWords(BigInt(hexToDecimal(y)), n_dsc, k_dsc)
    pubKey = [...dsc_modulus_x, ...dsc_modulus_y]
  } else {

    signature = splitToWords(
      BigInt(bytesToBigDecimal(encryptedDigest)),
      n_dsc,
      k_dsc
    )

    pubKey = splitToWords(
      BigInt(hexToDecimal(modulus)),
      n_dsc,
      k_dsc
    )
  }


  const dg1 = formatMrz(mrz);
  const dg1Hash = hash(signatureAlgorithm, dg1);

  const dg1HashOffset = findSubarrayIndex(eContent, dg1Hash)
  console.log('dg1HashOffset', dg1HashOffset);
  assert(dg1HashOffset !== -1, `DG1 hash ${dg1Hash} not found in eContent`);

  const eContentHash = hash(signatureAlgorithm, eContent);
  const eContentHashOffset = findSubarrayIndex(signedAttr, eContentHash)
  console.log('eContentHashOffset', eContentHashOffset);
  assert(eContentHashOffset !== -1, `eContent hash ${eContentHash} not found in signedAttr`);


  if (eContent.length > MAX_PADDED_ECONTENT_LEN) {
    console.error(`Data hashes too long (${eContent.length} bytes). Max length is ${MAX_PADDED_ECONTENT_LEN} bytes.`);
    throw new Error(`This length of datagroups (${eContent.length} bytes) is currently unsupported. Please contact us so we add support!`);
  }

  const [eContentPadded, eContentLen] = shaPad(
    signatureAlgorithm,
    new Uint8Array(eContent),
    MAX_PADDED_ECONTENT_LEN
  );
  const [signedAttrPadded, signedAttrPaddedLen] = shaPad(
    signatureAlgorithm,
    new Uint8Array(signedAttr),
    MAX_PADDED_SIGNED_ATTR_LEN
  );

  return {
    secret: [secret],
    dsc_secret: [dscSecret],
    dg1: dg1.map(byte => String(byte)),
    dg1_hash_offset: [dg1HashOffset.toString()], // uncomment when adding new circuits
    econtent: Array.from(eContentPadded).map((x) => x.toString()),
    econtent_padded_length: [eContentLen.toString()],
    signed_attr: Array.from(signedAttrPadded).map((x) => x.toString()),
    signed_attr_padded_length: [signedAttrPaddedLen.toString()],
    signed_attr_econtent_hash_offset: [eContentHashOffset.toString()],
    signature: signature,
    pubkey: pubKey,
    attestation_id: [attestation_id],
  };
}


export function generateCircuitInputsRegisterOld(
  secret: string,
  dscSecret: string,
  attestation_id: string,
  passportData: PassportData,
  n_dsc: number,
  k_dsc: number,
  // mocks: PassportData[] = mockPassportDatas
  mocks?: PassportData[]
) {
  const { mrz, dsc, dataGroupHashes, eContent, encryptedDigest } =
    passportData;

  const { signatureAlgorithm, hashFunction, hashLen, x, y, modulus } = parseCertificate(dsc);

  // const tree = getCSCAModulusMerkleTree(DEVELOPMENT_MODE);

  const supportedAlgorithms = [
    { signatureAlgorithm: 'rsa', hashFunction: 'sha1' },
    { signatureAlgorithm: 'rsa', hashFunction: 'sha256' },
    { signatureAlgorithm: 'rsapss', hashFunction: 'sha256' },
    { signatureAlgorithm: 'ecdsa', hashFunction: 'sha1' },
    { signatureAlgorithm: 'ecdsa', hashFunction: 'sha256' },
  ];

  const isSupported = supportedAlgorithms.some(
    (alg) => alg.signatureAlgorithm === signatureAlgorithm && alg.hashFunction === hashFunction
  );

  if (!isSupported) {
    throw new Error(`Verification of ${signatureAlgorithm} with ${hashFunction} has not been implemented.`);
  }

  const formattedMrz = formatMrz(mrz);
  const mrzHash = hash(hashFunction, formattedMrz);

  const dg1HashOffset = findSubarrayIndex(dataGroupHashes, mrzHash);
  assert(dg1HashOffset !== -1, 'MRZ hash index not found in dataGroupHashes');

  const concatHash = hash(hashFunction, dataGroupHashes);

  assert(
    arraysAreEqual(concatHash, eContent.slice(eContent.length - hashLen)),
    'concatHash is not at the right place in eContent'
  );

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

  let signatureComponents: any;
  let dscModulusComponents: any;

  if (signatureAlgorithm === 'ecdsa') {
    const { r, s } = extractRSFromSignature(encryptedDigest);

    signatureComponents = {
      signature_r: splitToWords(BigInt(hexToDecimal(r)), n_dsc, k_dsc),
      signature_s: splitToWords(BigInt(hexToDecimal(s)), n_dsc, k_dsc)
    };

    dscModulusComponents = {
      dsc_modulus_x: splitToWords(BigInt(hexToDecimal(x)), n_dsc, k_dsc),
      dsc_modulus_y: splitToWords(BigInt(hexToDecimal(y)), n_dsc, k_dsc)
    };
  } else {
    signatureComponents = {
      signature: splitToWords(
        BigInt(bytesToBigDecimal(encryptedDigest)),
        n_dsc,
        k_dsc
      )
    };

    dscModulusComponents = {
      dsc_modulus: splitToWords(
        BigInt(hexToDecimal(modulus)),
        n_dsc,
        k_dsc
      )
    };
  }

  return {
    secret: [secret],
    mrz: formattedMrz.map((byte) => String(byte)),
    dg1_hash_offset: [dg1HashOffset.toString()],
    dataHashes: Array.from(messagePadded).map((x) => x.toString()),
    datahashes_padded_length: [messagePaddedLen.toString()],
    eContent: eContent.map(toUnsignedByte).map((byte) => String(byte)),
    ...signatureComponents,
    ...dscModulusComponents,
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
  const pubkey_leaf = getLeaf(passportData.dsc, n_dsc, k_dsc);

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

  const index = findIndexInTree(merkletree, commitment);

  const { merkleProofSiblings, merkleProofIndices, depthForThisOne } = generateMerkleProof(
    merkletree,
    index,
    PUBKEY_TREE_DEPTH
  );

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
    scope: [castFromScope(scope)],
    current_date: getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString()),
    majority: majority.split('').map(char => BigInt(char.charCodeAt(0)).toString()),
    user_identifier: [castFromUUID(user_identifier)],
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
  user_identifier_type: 'uuid' | 'hex' | 'ascii' = DEFAULT_USER_ID_TYPE
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
    user_identifier: [parseUIDToBigInt(user_identifier, user_identifier_type)],
    scope: [castFromScope(scope)]
  };

}