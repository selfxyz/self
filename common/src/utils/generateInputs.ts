import { poseidon12 } from "poseidon-lite";
import { MAX_DATAHASHES_LEN, SignatureAlgorithm } from "../constants/constants";
import { buildPubkeyTree } from "./pubkeyTree";
import { assert, sha256Pad } from "./sha256Pad";
import { PassportData } from "./types";
import { arraysAreEqual, bigIntToChunkedBytes, bytesToBigDecimal, formatMrz, formatSigAlg, hash, splitToWords, toUnsignedByte } from "./utils";

export function generateCircuitInputs(passportData: PassportData, pubkeys: any[], reveal_bitmap: string[], address: string) {
  const tree = buildPubkeyTree(pubkeys);

  const formattedMrz = formatMrz(passportData.mrz);

  const concatenatedDataHashesHashDigest = hash(passportData.dataGroupHashes);
  console.log('concatenatedDataHashesHashDigest', concatenatedDataHashesHashDigest);

  assert(
    arraysAreEqual(passportData.eContent.slice(72, 72 + 32), concatenatedDataHashesHashDigest),
    'concatenatedDataHashesHashDigest is at the right place in passportData.eContent'
  )

  const sigAlgFormatted = formatSigAlg(passportData.signatureAlgorithm, passportData.pubKey.exponent)
  const pubkeyChunked = bigIntToChunkedBytes(BigInt(passportData.pubKey.modulus as string), 192, 11);
  const leaf = poseidon12([SignatureAlgorithm[sigAlgFormatted], ...pubkeyChunked])

  const index = tree.indexOf(leaf) // this index is not the index in publicKeysParsed.json, but the index in the tree
  console.log(`pubkey found in the registry.`)
  console.log(`leaf: ${leaf}`)

  const proof = tree.createProof(index)
  console.log("verifyProof", tree.verifyProof(proof))

  const [messagePadded, messagePaddedLen] = sha256Pad(
    new Uint8Array(passportData.dataGroupHashes),
    MAX_DATAHASHES_LEN
  );

  return {
    mrz: formattedMrz.map(byte => String(byte)),
    reveal_bitmap: reveal_bitmap.map(byte => String(byte)),
    dataHashes: Array.from(messagePadded).map((x) => x.toString()),
    datahashes_padded_length: messagePaddedLen.toString(),
    eContentBytes: passportData.eContent.map(toUnsignedByte).map(byte => String(byte)),
    signature: splitToWords(
      BigInt(bytesToBigDecimal(passportData.encryptedDigest)),
      BigInt(64),
      BigInt(32)
    ),
    signatureAlgorithm: SignatureAlgorithm[sigAlgFormatted],
    pubkey: splitToWords(
      BigInt(passportData.pubKey.modulus as string),
      BigInt(64),
      BigInt(32)
    ),
    pathIndices: proof.pathIndices,
    siblings: proof.siblings.flat(),
    root: tree.root,
    address,
  }
}