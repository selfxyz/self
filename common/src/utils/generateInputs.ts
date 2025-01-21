import {
  PUBKEY_TREE_DEPTH,
  MAX_PADDED_ECONTENT_LEN,
  MAX_PADDED_SIGNED_ATTR_LEN,
} from '../constants/constants';
import { assert, sha384_512Pad, shaPad } from './shaPad';
import { PassportData, SignatureAlgorithm } from './types';
import {
  bytesToBigDecimal,
  formatMrz,
  splitToWords,
  getCurrentDateYYMMDD,
  generateMerkleProof,
  generateSMTProof,
  hexToDecimal,
  extractRSFromSignature,
  castFromUUID,
  castFromScope,
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
import { parsePassportData, PassportMetadata } from './parsePassportData';

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
    closestleaf: smt_leaf_key,
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
    smt_leaf_key: formatInput(smt_leaf_key),
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
    smt_leaf_key: formatInput(closestleaf),
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
    smt_leaf_key: formatInput(closestleaf),
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



export function generateCircuitInputsRegister(
  secret: number | string,
  dsc_secret: number | string,
  passportData: PassportData
) {
  const { mrz, eContent, signedAttr, dg2Hash } = passportData;
  const passportMetadata = parsePassportData(passportData);

  const { pubKey, signature, signatureAlgorithmFullName } = getDscPubKeyInfo(passportData);
  const mrz_formatted = formatMrz(mrz);
  const dg2Hash_formatted = formatDg2Hash(dg2Hash);

  if (eContent.length > MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]) {
    console.error(
      `eContent too long (${eContent.length} bytes). Max length is ${MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]} bytes.`
    );
    throw new Error(
      `This length of datagroups (${eContent.length} bytes) is currently unsupported. Please contact us so we add support!`
    );
  }

  const [eContentPadded, eContentLen] = padDg1(passportMetadata)(
    new Uint8Array(eContent),
    MAX_PADDED_ECONTENT_LEN[passportMetadata.dg1HashFunction]
  );
  const [signedAttrPadded, signedAttrPaddedLen] = padEContent(passportMetadata)(
    new Uint8Array(signedAttr),
    MAX_PADDED_SIGNED_ATTR_LEN[passportMetadata.eContentHashFunction]
  );

  const inputs = {
    dg1: mrz_formatted,
    dg1_hash_offset: passportMetadata.dg1HashOffset,
    dg2_hash: dg2Hash_formatted,
    eContent: eContentPadded,
    eContent_padded_length: eContentLen,
    signed_attr: signedAttrPadded,
    signed_attr_padded_length: signedAttrPaddedLen,
    signed_attr_econtent_hash_offset: passportMetadata.eContentHashOffset,
    signature: signature,
    pubKey: pubKey,
    secret: secret,
    dsc_secret: dsc_secret,
  };

  return Object.entries(inputs).map(([key, value]) => ({
    [key]: formatInput(value)
  })).reduce((acc, curr) => ({ ...acc, ...curr }), {});
}

function getDscPubKeyInfo(passportData: PassportData) {
  const passportMetadata = parsePassportData(passportData);
  const hashAlgorithm = passportMetadata.signedAttrHashFunction;
  const { signatureAlgorithm, publicKeyDetails } = parseCertificateSimple(passportData.dsc);
  let n, k;
  let pubKey: any;
  let signature: any;
  let signatureAlgorithmFullName: string;

  if (signatureAlgorithm === 'ecdsa') {
    signatureAlgorithmFullName = `${signatureAlgorithm}_${hashAlgorithm}_${(publicKeyDetails as PublicKeyDetailsECDSA).curve}_${publicKeyDetails.bits}`;
    ({ n, k } = getNAndK(signatureAlgorithmFullName as SignatureAlgorithm));
    const { x, y } = publicKeyDetails as PublicKeyDetailsECDSA;
    const { r, s } = extractRSFromSignature(passportData.encryptedDigest);
    const signature_r = splitToWords(BigInt(hexToDecimal(r)), n, k);
    const signature_s = splitToWords(BigInt(hexToDecimal(s)), n, k);
    signature = [...signature_r, ...signature_s];
    const x_dsc = splitToWords(BigInt(hexToDecimal(x)), n, k);
    const y_dsc = splitToWords(BigInt(hexToDecimal(y)), n, k);
    pubKey = [...x_dsc, ...y_dsc];
  } else {
    const { modulus, exponent } = publicKeyDetails as PublicKeyDetailsRSA;
    signatureAlgorithmFullName = `${signatureAlgorithm}_${hashAlgorithm}_${exponent}_${publicKeyDetails.bits}`;
    ({ n, k } = getNAndK(signatureAlgorithmFullName as SignatureAlgorithm));
    signature = splitToWords(BigInt(bytesToBigDecimal(passportData.encryptedDigest)), n, k);
    pubKey = splitToWords(BigInt(hexToDecimal(modulus)), n, k);
  }
  return {
    pubKey: pubKey,
    signature: signature,
    signatureAlgorithmFullName: signatureAlgorithmFullName,
  };
}

function padDg1(passportMetadata: PassportMetadata) {
  return passportMetadata.dg1HashFunction === 'sha1' ||
    passportMetadata.dg1HashFunction === 'sha224' ||
    passportMetadata.dg1HashFunction === 'sha256'
    ? shaPad
    : sha384_512Pad;
}

function padEContent(passportMetadata: PassportMetadata) {
  return passportMetadata.eContentHashFunction === 'sha1' ||
    passportMetadata.eContentHashFunction === 'sha224' ||
    passportMetadata.eContentHashFunction === 'sha256'
    ? shaPad
    : sha384_512Pad;
}

export function formatInput(input: any) {
  if (Array.isArray(input)) {
    return input.map((item) => BigInt(item).toString());
  } else if (input instanceof Uint8Array) {
    return Array.from(input).map(num => BigInt(num).toString());
  } else if (typeof input === 'string' && input.includes(',')) {
    const numbers = input
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '' && !isNaN(Number(s)))
      .map(Number);

    try {
      return numbers.map(num => BigInt(num).toString());
    } catch (e) {
      throw e;
    }
  } else {
    return [BigInt(input).toString()];
  }
}
