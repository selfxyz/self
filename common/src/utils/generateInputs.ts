import { MAX_DATAHASHES_LEN, SignatureAlgorithm, TREE_DEPTH } from "../constants/constants";
import { assert, shaPad } from "./shaPad";
import { PassportData } from "./types";
import { arraysAreEqual, bytesToBigDecimal, formatMrz, formatSigAlg, hash, splitToWords,
  toUnsignedByte, getCurrentDateYYMMDD, getDigestLengthBytes } from "./utils";
import { IMT } from "@zk-kit/imt";
import { getLeaf } from "./pubkeyTree";
import serializedTree from "../../pubkeys/serialized_tree.json";
import { poseidon2 } from "poseidon-lite";

export function generateCircuitInputs(
  passportData: PassportData,
  reveal_bitmap: string[],
  address: string,
  majority: number,
  options: { developmentMode?: boolean } = { developmentMode: false }
) {
  const tree = new IMT(poseidon2, TREE_DEPTH, 0, 2)
  tree.setNodes(serializedTree)

  if (options.developmentMode) {
    // This adds the pubkey of the passportData to the registry so that it's always found for testing purposes.
    tree.insert(getLeaf({
      signatureAlgorithm: passportData.signatureAlgorithm,
      issuer: 'C = TS, O = Government of Syldavia, OU = Ministry of tests, CN = CSCA-TEST',
      modulus: passportData.pubKey.modulus,
      exponent: passportData.pubKey.exponent
    }).toString())
  }

  if (!["sha256WithRSAEncryption", "sha1WithRSAEncryption"].includes(passportData.signatureAlgorithm)) {
    console.log(`${passportData.signatureAlgorithm} not supported for proof right now.`);
    throw new Error(`${passportData.signatureAlgorithm} not supported for proof right now.`);
  }

  const formattedMrz = formatMrz(passportData.mrz);
  const concatenatedDataHashesHashDigest = hash(passportData.signatureAlgorithm, passportData.dataGroupHashes);
  console.log('concatenatedDataHashesHashDigest', concatenatedDataHashesHashDigest);

  assert(
    arraysAreEqual(passportData.eContent.slice(72, 72 + getDigestLengthBytes(passportData.signatureAlgorithm)),
    concatenatedDataHashesHashDigest),
    'concatenatedDataHashesHashDigest is at the right place in passportData.eContent'
  )

  console.log('passportData.pubKey.exponent', passportData.pubKey.exponent)

  const sigAlgFormatted = formatSigAlg(
    passportData.signatureAlgorithm,
    passportData.pubKey.exponent
  )

  const leaf = getLeaf({
    signatureAlgorithm: passportData.signatureAlgorithm,
    ...passportData.pubKey,
  }).toString()
  console.log('leaf', leaf)

  const index = tree.indexOf(leaf) // this index is not the index in public_keys_parsed.json, but the index in the tree
  console.log(`Index of pubkey in the registry: ${index}`)
  if (index === -1) {
    throw new Error("Your public key was not found in the registry");
  }

  const proof = tree.createProof(index)
  console.log("verifyProof", tree.verifyProof(proof))

  if (passportData.dataGroupHashes.length > MAX_DATAHASHES_LEN) {
    console.log(`Data hashes too long. Max length is ${MAX_DATAHASHES_LEN} bytes.`);
    throw new Error(`This number of datagroups is currently unsupported. Please contact us so we add support!`);
  }

  const [messagePadded, messagePaddedLen] = shaPad(
    passportData.signatureAlgorithm,
    new Uint8Array(passportData.dataGroupHashes),
    MAX_DATAHASHES_LEN
  );

  // don't forget to wrap everything in arrays for mopro bindings
  return {
    mrz: formattedMrz.map(byte => String(byte)),
    reveal_bitmap: reveal_bitmap.map(byte => String(byte)),
    dataHashes: Array.from(messagePadded).map((x) => x.toString()),
    datahashes_padded_length: [messagePaddedLen.toString()],
    eContentBytes: passportData.eContent.map(toUnsignedByte).map(byte => String(byte)),
    signature: splitToWords(
      BigInt(bytesToBigDecimal(passportData.encryptedDigest)),
      BigInt(64),
      BigInt(32)
    ),
    signatureAlgorithm: [SignatureAlgorithm[sigAlgFormatted].toString()],
    pubkey: splitToWords(
      BigInt(passportData.pubKey.modulus as string),
      BigInt(64),
      BigInt(32)
    ),
    pathIndices: proof.pathIndices.map(index => index.toString()),
    siblings: proof.siblings.flat().map(index => index.toString()),
    root: [tree.root.toString()],
    address: [BigInt(address).toString()],
    majority: [BigInt(Math.floor(majority / 10) + 48).toString(), BigInt(majority % 10 + 48).toString()],
    current_date: getCurrentDateYYMMDD().map(datePart => BigInt(datePart).toString()),
  }
}