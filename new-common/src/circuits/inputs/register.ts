import {
  max_dsc_bytes,
  MAX_PADDED_ECONTENT_LEN,
  MAX_PADDED_SIGNED_ATTR_LEN,
  MAX_PADDED_SIGNED_ATTR_LEN_FOR_TESTS,
} from '../../foundation/constants/crypto.js';
import type { PassportData, SignatureAlgorithm } from '../../foundation/types/document.js';
import { findStartPubKeyIndex } from '../../certificates/pubkey.js';
import { getPassportSignatureInfos } from '../../documents/passport/commitment.js';
import { pad } from '../../documents/passport/core.js';
import { formatMrz } from '../../documents/passport/format.js';
import {
  getDscTreeInclusionProof,
  getLeafCscaTree,
  getLeafDscTree,
} from '../../trees/index.js';
import { formatInput } from './format.js';

export function generateCircuitInputsRegister(
  secret: string,
  passportData: PassportData,
  serializedDscTree: string
) {
  const { mrz, eContent, signedAttr } = passportData;
  const passportMetadata = passportData.passportMetadata!;
  const dscParsed = passportData.dsc_parsed!;

  const [dscTbsBytesPadded] = pad(dscParsed.hashAlgorithm)(dscParsed.tbsBytes, max_dsc_bytes);

  const { pubKey, signature, signatureAlgorithmFullName } =
    getPassportSignatureInfos(passportData);
  const mrz_formatted = formatMrz(mrz);

  if (eContent.length > MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName as keyof typeof MAX_PADDED_ECONTENT_LEN]!) {
    console.error(
      `eContent too long (${eContent.length} bytes). Max length is ${MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName as keyof typeof MAX_PADDED_ECONTENT_LEN]} bytes.`
    );
    throw new Error(
      `This length of datagroups (${eContent.length} bytes) is currently unsupported. Please contact us so we add support!`
    );
  }

  const [eContentPadded, eContentLen] = pad(passportMetadata.eContentHashFunction)(
    eContent,
    MAX_PADDED_ECONTENT_LEN[passportMetadata.dg1HashFunction]!
  );
  const [signedAttrPadded, signedAttrPaddedLen] = pad(passportMetadata.signedAttrHashFunction)(
    signedAttr,
    MAX_PADDED_SIGNED_ATTR_LEN[passportMetadata.eContentHashFunction]
  );

  const dsc_leaf = getLeafDscTree(dscParsed, passportData.csca_parsed!);
  const [root, path, siblings, leaf_depth] = getDscTreeInclusionProof(
    dsc_leaf,
    serializedDscTree
  );
  const csca_tree_leaf = getLeafCscaTree(passportData.csca_parsed!);

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
  const passportMetadata = passportData.passportMetadata!;
  const dscParsed = passportData.dsc_parsed!;

  const [dscTbsBytesPadded] = pad(dscParsed.hashAlgorithm)(dscParsed.tbsBytes, max_dsc_bytes);

  const { pubKey, signature, signatureAlgorithmFullName } =
    getPassportSignatureInfos(passportData);
  const mrz_formatted = formatMrz(mrz);

  if (eContent.length > MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName as keyof typeof MAX_PADDED_ECONTENT_LEN]!) {
    console.error(
      `eContent too long (${eContent.length} bytes). Max length is ${MAX_PADDED_ECONTENT_LEN[signatureAlgorithmFullName as keyof typeof MAX_PADDED_ECONTENT_LEN]} bytes.`
    );
    throw new Error(
      `This length of datagroups (${eContent.length} bytes) is currently unsupported. Please contact us so we add support!`
    );
  }

  const [eContentPadded, eContentLen] = pad(passportMetadata.eContentHashFunction)(
    eContent,
    MAX_PADDED_ECONTENT_LEN[passportMetadata.dg1HashFunction]!
  );
  const [signedAttrPadded, signedAttrPaddedLen] = pad(passportMetadata.signedAttrHashFunction)(
    signedAttr,
    MAX_PADDED_SIGNED_ATTR_LEN_FOR_TESTS[passportMetadata.eContentHashFunction]
  );

  const dsc_leaf = getLeafDscTree(dscParsed, passportData.csca_parsed!);
  const [root, path, siblings, leaf_depth] = getDscTreeInclusionProof(
    dsc_leaf,
    serializedDscTree
  );
  const csca_tree_leaf = getLeafCscaTree(passportData.csca_parsed!);

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
