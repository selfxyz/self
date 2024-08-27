import { MAX_PADDED_ECONTENT_LEN, MAX_PADDED_SIGNED_ATTR_LEN, SignatureAlgorithm, PUBKEY_TREE_DEPTH, DEVELOPMENT_MODE } from "../constants/constants";
import { assert, shaPad } from "./shaPad";
import { PassportData } from "./types";
import {
  arraysAreEqual, bytesToBigDecimal, formatMrz, formatSigAlgNameForCircuit, hash, splitToWords,
  toUnsignedByte, getHashLen, getCurrentDateYYMMDD,
  generateMerkleProof,
  findSubarrayIndex
} from "./utils";
import { LeanIMT } from "@zk-kit/lean-imt";
import { IMT } from "@zk-kit/imt";
import { getLeaf } from "./pubkeyTree";
import serializedTree from "../../pubkeys/serialized_tree.json";
import { poseidon2, poseidon6 } from "poseidon-lite";
import { packBytes } from "../utils/utils";
import {
  mockPassportDatas,
} from "./mockPassportData";

export function generateCircuitInputsRegister(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  mocks: PassportData[] = mockPassportDatas
) {
  const { mrz, signatureAlgorithm, pubKey, eContent, signedAttr, encryptedDigest } = passportData;

  const tree = new IMT(poseidon2, PUBKEY_TREE_DEPTH, 0, 2);
  tree.setNodes(JSON.parse(JSON.stringify(serializedTree))); //deep copy

  if (DEVELOPMENT_MODE) {
    for (const mockPassportData of mocks) {
      tree.insert(getLeaf(mockPassportData).toString());
    }
  }

  if (![
    "sha256WithRSAEncryption",
    // "sha1WithRSAEncryption",
    // "sha256WithRSASSAPSS"
  ].includes(signatureAlgorithm)) {
    console.error(`${signatureAlgorithm} has not been implemented.`);
    throw new Error(`${signatureAlgorithm} has not been implemented.`);
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

  const leaf = getLeaf({
    signatureAlgorithm: signatureAlgorithm,
    ...pubKey,
  }).toString();

  const index = tree.indexOf(leaf);
  // console.log(`Index of pubkey in the registry: ${index}`);
  if (index === -1) {
    throw new Error("Your public key was not found in the registry");
  }

  const proof = tree.createProof(index);
  // console.log("verifyProof", tree.verifyProof(proof));

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
    dg1: dg1.map(byte => String(byte)),
    dg1_hash_offset: [dg1HashOffset.toString()], // uncomment when adding new circuits
    econtent: Array.from(eContentPadded).map((x) => x.toString()),
    econtent_padded_length: [eContentLen.toString()],
    signed_attr: Array.from(signedAttrPadded).map((x) => x.toString()),
    signed_attr_padded_length: [signedAttrPaddedLen.toString()],
    signed_attr_econtent_hash_offset: [eContentHashOffset.toString()],
    signature: splitToWords(
      BigInt(bytesToBigDecimal(encryptedDigest)),
      BigInt(64),
      BigInt(32)
    ),
    pubkey: splitToWords(
      BigInt(pubKey.modulus as string),
      BigInt(64),
      BigInt(32)
    ),
    merkle_root: [tree.root.toString()],
    path: proof.pathIndices.map(index => index.toString()),
    siblings: proof.siblings.flat().map(index => index.toString()),
    attestation_id: [attestation_id],
  };
}

export function generateCircuitInputsDisclose(
  secret: string,
  attestation_id: string,
  passportData: PassportData,
  merkletree: LeanIMT,
  majority: string[],
  bitmap: string[],
  scope: string,
  user_identifier: string,
) {
  const pubkey_leaf = getLeaf({
    signatureAlgorithm: passportData.signatureAlgorithm,
    modulus: passportData.pubKey.modulus,
    exponent: passportData.pubKey.exponent,
  });

  const dg1 = formatMrz(passportData.mrz);
  const dg1_bytes = packBytes(dg1);
  const commitment = poseidon6([
    secret,
    attestation_id,
    pubkey_leaf,
    dg1_bytes[0],
    dg1_bytes[1],
    dg1_bytes[2]
  ]);

  console.log('commitment', commitment.toString());

  const index = findIndexInTree(merkletree, commitment);

  const { merkleProofSiblings, merkleProofIndices, depthForThisOne } = generateMerkleProof(merkletree, index, PUBKEY_TREE_DEPTH)

  return {
    secret: [secret],
    attestation_id: [attestation_id],
    pubkey_leaf: [pubkey_leaf.toString()],
    dg1: dg1.map(byte => String(byte)),
    merkle_root: [merkletree.root.toString()],
    merkletree_size: [BigInt(depthForThisOne).toString()],
    path: merkleProofIndices.map(index => BigInt(index).toString()),
    siblings: merkleProofSiblings.map(index => BigInt(index).toString()),
    bitmap: bitmap,
    scope: [scope],
    current_date: getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString()),
    majority: majority.map(char => BigInt(char.charCodeAt(0)).toString()),
    user_identifier: [user_identifier],
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
    throw new Error("This commitment was not found in the tree");
  } else {
    console.log(`Index of commitment in the registry: ${index}`);
  }
  return index;
}
