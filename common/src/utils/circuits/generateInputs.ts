import {
  COMMITMENT_TREE_DEPTH,
  max_csca_bytes,
  max_dsc_bytes,
  MAX_PADDED_ECONTENT_LEN,
  MAX_PADDED_SIGNED_ATTR_LEN,
  MAX_PADDED_SIGNED_ATTR_LEN_FOR_TESTS,
  OFAC_TREE_LEVELS,
} from '../../constants/constants.js';
import { getCurrentDateYYMMDD } from '../date.js';
import { hash, packBytesAndPoseidon } from '../hash.js';
import { formatMrz } from '../passports/format.js';
import {
  extractSignatureFromDSC,
  findStartPubKeyIndex,
  formatSignatureDSCCircuit,
  generateCommitment,
  getCertificatePubKey,
  getPassportSignatureInfos,
  pad,
  padWithZeroes,
} from '../passports/passport.js';
import {
  generateMerkleProof,
  generateSMTProof,
  getCountryLeaf,
  getCscaTreeInclusionProof,
  getDscTreeInclusionProof,
  getLeafCscaTree,
  getLeafDscTree,
  getNameDobLeaf,
  getNameYobLeaf,
  getPassportNumberAndNationalityLeaf,
} from '../trees.js';
import type { PassportData } from '../types.js';
import { formatCountriesList } from './formatInputs.js';
import { stringToAsciiBigIntArray } from './uuid.js';

import type { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import type { SMT } from '@openpassport/zk-kit-smt';

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

export function formatInput(input: any) {
  if (Array.isArray(input)) {
    return input.map((item) => BigInt(item).toString());
  } else if (input instanceof Uint8Array) {
    return Array.from(input).map((num) => BigInt(num).toString());
  } else if (typeof input === 'string' && input.includes(',')) {
    const numbers = input
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '' && !isNaN(Number(s)))
      .map(Number);

    try {
      return numbers.map((num) => BigInt(num).toString());
    } catch (e) {
      throw e;
    }
  } else {
    return [BigInt(input).toString()];
  }
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

export function generateCircuitInputsDSC(
  passportData: PassportData,
  serializedCscaTree: string[][]
) {
  const passportMetadata = passportData.passportMetadata;
  const cscaParsed = passportData.csca_parsed;
  const dscParsed = passportData.dsc_parsed;
  const raw_dsc = passportData.dsc;
  // CSCA is padded with 0s to max_csca_bytes
  const cscaTbsBytesPadded = padWithZeroes(cscaParsed.tbsBytes, max_csca_bytes);
  const dscTbsBytes = dscParsed.tbsBytes;

  // DSC is padded using sha padding because it will be hashed in the circuit
  const [dscTbsBytesPadded, dscTbsBytesLen] = pad(passportMetadata.cscaHashFunction)(
    dscTbsBytes,
    max_dsc_bytes
  );
  const leaf = getLeafCscaTree(cscaParsed);
  const [root, path, siblings] = getCscaTreeInclusionProof(leaf, serializedCscaTree);
  // Parse CSCA certificate and get its public key
  const csca_pubKey_formatted = getCertificatePubKey(
    cscaParsed,
    passportMetadata.cscaSignatureAlgorithm,
    passportMetadata.cscaHashFunction
  );

  const signatureRaw = extractSignatureFromDSC(raw_dsc);
  const signature = formatSignatureDSCCircuit(
    passportMetadata.cscaSignatureAlgorithm,
    passportMetadata.cscaHashFunction,
    cscaParsed,
    signatureRaw
  );
  // Get start index of CSCA pubkey based on algorithm
  const [startIndex, keyLength] = findStartPubKeyIndex(
    cscaParsed,
    cscaTbsBytesPadded,
    passportMetadata.cscaSignatureAlgorithm
  );
  return {
    raw_csca: cscaTbsBytesPadded.map((x) => x.toString()),
    raw_csca_actual_length: BigInt(cscaParsed.tbsBytes.length).toString(),
    csca_pubKey_offset: startIndex.toString(),
    csca_pubKey_actual_size: BigInt(keyLength).toString(),
    raw_dsc: Array.from(dscTbsBytesPadded).map((x) => x.toString()),
    raw_dsc_padded_length: BigInt(dscTbsBytesLen).toString(), // with the sha padding actually
    csca_pubKey: csca_pubKey_formatted,
    signature,
    merkle_root: root,
    path: path,
    siblings: siblings,
  };
}

export function generateCircuitInputsOfac(
  passportData: PassportData,
  sparsemerkletree: SMT,
  proofLevel: number
) {
  const { mrz, documentType } = passportData;
  const isPassportType = documentType === 'passport' || documentType === 'mock_passport';

  const mrz_bytes = formatMrz(mrz); // Assume formatMrz handles basic formatting
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

  if (proofLevel == 3) {
    if (!isPassportType) {
      throw new Error(
        'Proof level 3 (Passport Number) is only applicable to passport document types.'
      );
    }
    leafToProve = getPassportNumberAndNationalityLeaf(passNoSlice, nationalitySlice);
  } else if (proofLevel == 2) {
    leafToProve = getNameDobLeaf(nameSlice, dobSlice);
  } else if (proofLevel == 1) {
    leafToProve = getNameYobLeaf(nameSlice, yobSlice);
  } else {
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

export function generateCircuitInputsRegister(
  secret: string,
  passportData: PassportData,
  serializedDscTree: string
) {
  const { mrz, eContent, signedAttr } = passportData;
  const passportMetadata = passportData.passportMetadata;
  const dscParsed = passportData.dsc_parsed;

  const [dscTbsBytesPadded] = pad(dscParsed.hashAlgorithm)(dscParsed.tbsBytes, max_dsc_bytes);

  const { pubKey, signature, signatureAlgorithmFullName } = getPassportSignatureInfos(passportData);
  const mrz_formatted = formatMrz(mrz);

  if (eContent.length > MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]) {
    console.error(
      `eContent too long (${eContent.length} bytes). Max length is ${MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]} bytes.`
    );
    throw new Error(
      `This length of datagroups (${eContent.length} bytes) is currently unsupported. Please contact us so we add support!`
    );
  }

  const [eContentPadded, eContentLen] = pad(passportMetadata.eContentHashFunction)(
    eContent,
    MAX_PADDED_ECONTENT_LEN[passportMetadata.dg1HashFunction]
  );
  const [signedAttrPadded, signedAttrPaddedLen] = pad(passportMetadata.signedAttrHashFunction)(
    signedAttr,
    MAX_PADDED_SIGNED_ATTR_LEN[passportMetadata.eContentHashFunction]
  );

  const dsc_leaf = getLeafDscTree(dscParsed, passportData.csca_parsed); // TODO: WRONG
  const [root, path, siblings, leaf_depth] = getDscTreeInclusionProof(dsc_leaf, serializedDscTree);
  const csca_tree_leaf = getLeafCscaTree(passportData.csca_parsed);

  // Get start index of DSC pubkey based on algorithm
  const [startIndex, keyLength] = findStartPubKeyIndex(
    dscParsed,
    dscTbsBytesPadded,
    dscParsed.signatureAlgorithm
  );

  const inputs = {
    raw_dsc: dscTbsBytesPadded.map((x) => x.toString()),
    raw_dsc_actual_length: [BigInt(dscParsed.tbsBytes.length).toString()],
    dsc_pubKey_offset: startIndex,
    dsc_pubKey_actual_size: [BigInt(keyLength).toString()],
    dg1: mrz_formatted,
    dg1_hash_offset: passportMetadata.dg1HashOffset,
    eContent: eContentPadded,
    eContent_padded_length: eContentLen,
    signed_attr: signedAttrPadded,
    signed_attr_padded_length: signedAttrPaddedLen,
    signed_attr_econtent_hash_offset: passportMetadata.eContentHashOffset,
    pubKey_dsc: pubKey,
    signature_passport: signature,
    merkle_root: [BigInt(root).toString()],
    leaf_depth: leaf_depth,
    path: path,
    siblings: siblings,
    csca_tree_leaf: csca_tree_leaf,
    secret: secret,
  };

  return Object.entries(inputs)
    .map(([key, value]) => ({
      [key]: formatInput(value),
    }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});
}

export function generateCircuitInputsRegisterForTests(
  secret: string,
  passportData: PassportData,
  serializedDscTree: string
) {
  const { mrz, eContent, signedAttr } = passportData;
  const passportMetadata = passportData.passportMetadata;
  const dscParsed = passportData.dsc_parsed;

  const [dscTbsBytesPadded] = pad(dscParsed.hashAlgorithm)(dscParsed.tbsBytes, max_dsc_bytes);

  const { pubKey, signature, signatureAlgorithmFullName } = getPassportSignatureInfos(passportData);
  const mrz_formatted = formatMrz(mrz);

  if (eContent.length > MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]) {
    console.error(
      `eContent too long (${eContent.length} bytes). Max length is ${MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName]} bytes.`
    );
    throw new Error(
      `This length of datagroups (${eContent.length} bytes) is currently unsupported. Please contact us so we add support!`
    );
  }

  const [eContentPadded, eContentLen] = pad(passportMetadata.eContentHashFunction)(
    eContent,
    MAX_PADDED_ECONTENT_LEN[passportMetadata.dg1HashFunction]
  );
  const [signedAttrPadded, signedAttrPaddedLen] = pad(passportMetadata.signedAttrHashFunction)(
    signedAttr,
    MAX_PADDED_SIGNED_ATTR_LEN_FOR_TESTS[passportMetadata.eContentHashFunction]
  );

  const dsc_leaf = getLeafDscTree(dscParsed, passportData.csca_parsed); // TODO: WRONG
  const [root, path, siblings, leaf_depth] = getDscTreeInclusionProof(dsc_leaf, serializedDscTree);
  const csca_tree_leaf = getLeafCscaTree(passportData.csca_parsed);

  // Get start index of DSC pubkey based on algorithm
  const [startIndex, keyLength] = findStartPubKeyIndex(
    dscParsed,
    dscTbsBytesPadded,
    dscParsed.signatureAlgorithm
  );

  const inputs = {
    raw_dsc: dscTbsBytesPadded.map((x) => x.toString()),
    raw_dsc_actual_length: [BigInt(dscParsed.tbsBytes.length).toString()],
    dsc_pubKey_offset: startIndex,
    dsc_pubKey_actual_size: [BigInt(keyLength).toString()],
    dg1: mrz_formatted,
    dg1_hash_offset: passportMetadata.dg1HashOffset,
    eContent: eContentPadded,
    eContent_padded_length: eContentLen,
    signed_attr: signedAttrPadded,
    signed_attr_padded_length: signedAttrPaddedLen,
    signed_attr_econtent_hash_offset: passportMetadata.eContentHashOffset,
    pubKey_dsc: pubKey,
    signature_passport: signature,
    merkle_root: [BigInt(root).toString()],
    leaf_depth: leaf_depth,
    path: path,
    siblings: siblings,
    csca_tree_leaf: csca_tree_leaf,
    secret: secret,
  };

  return Object.entries(inputs)
    .map(([key, value]) => ({
      [key]: formatInput(value),
    }))
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});
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
  const { mrz, eContent, signedAttr, documentType } = passportData;
  const passportMetadata = passportData.passportMetadata;
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

  const dsc_tree_leaf = getLeafDscTree(passportData.dsc_parsed, passportData.csca_parsed);

  const commitment = generateCommitment(secret, attestation_id, passportData);
  const index = findIndexInTree(merkletree, BigInt(commitment));
  const { siblings, path, leaf_depth } = generateMerkleProof(
    merkletree,
    index,
    COMMITMENT_TREE_DEPTH
  );
  const formattedMajority = majority.length === 1 ? `0${majority}` : majority;
  const majority_ascii = formattedMajority.split('').map((char) => char.charCodeAt(0));

  // Define default values for SMT proofs (BigInt(0) for roots/keys, array of 0s for siblings)
  const defaultSiblings = Array(OFAC_TREE_LEVELS).fill(BigInt(0));
  let passportNoProof = {
    root: BigInt(0),
    closestleaf: BigInt(0),
    siblings: defaultSiblings,
  };
  let nameDobProof;
  let nameYobProof;

  // Calculate leaves based on document type (using OFAC logic for slicing)
  const nameSlice = isPassportType ? formattedMrz.slice(10, 49) : formattedMrz.slice(65, 95);
  const dobSlice = isPassportType ? formattedMrz.slice(62, 68) : formattedMrz.slice(35, 41);
  const yobSlice = isPassportType ? formattedMrz.slice(62, 64) : formattedMrz.slice(35, 37);
  const nationalitySlice = isPassportType ? formattedMrz.slice(59, 62) : formattedMrz.slice(50, 53);
  const passNoSlice = isPassportType ? formattedMrz.slice(49, 58) : formattedMrz.slice(10, 19);

  const namedob_leaf = getNameDobLeaf(nameSlice, dobSlice);
  const nameyob_leaf = getNameYobLeaf(nameSlice, yobSlice);

  // Generate Name/DOB and Name/YOB proofs (always needed)
  nameDobProof = generateSMTProof(nameAndDob_smt, namedob_leaf);
  nameYobProof = generateSMTProof(nameAndYob_smt, nameyob_leaf);

  // Generate Passport Number proof only if it's a passport type and SMT is provided
  if (isPassportType) {
    if (!passportNo_smt) {
      console.warn('Document type is passport, but passportNo_smt tree was not provided.');
    } else {
      const passportNo_leaf = getPassportNumberAndNationalityLeaf(passNoSlice, nationalitySlice);
      const proofResult = generateSMTProof(passportNo_smt, passportNo_leaf);
      // Explicitly cast root and closestleaf to bigint
      passportNoProof = {
        root: BigInt(proofResult.root),
        closestleaf: BigInt(proofResult.closestleaf),
        siblings: proofResult.siblings,
      };
    }
  }
  // Build Final Input Object
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

  // Conditionally include passport OFAC inputs
  const finalInputs = {
    ...baseInputs,
    ...ofacNameInputs,
    ...(isPassportType && {
      ofac_passportno_smt_root: formatInput(passportNoProof.root),
      ofac_passportno_smt_leaf_key: formatInput(passportNoProof.closestleaf),
      ofac_passportno_smt_siblings: formatInput(passportNoProof.siblings),
    }),
  };

  return finalInputs;
}
