import { MAX_DATAHASHES_LEN, SignatureAlgorithm } from "../constants/constants";
import { assert, sha256Pad } from "./sha256Pad";
import { PassportData } from "./types";
import { arraysAreEqual, bytesToBigDecimal, formatMrz, formatSigAlg, hash, splitToWords, toUnsignedByte } from "./utils";
import { IMT } from "@zk-kit/imt";
import { getLeaf } from "./pubkeyTree";

export function generateCircuitInputs(passportData: PassportData, tree: IMT, reveal_bitmap: string[], address: string) {
  const formattedMrz = formatMrz(passportData.mrz);

  const concatenatedDataHashesHashDigest = hash(passportData.dataGroupHashes);
  console.log('concatenatedDataHashesHashDigest', concatenatedDataHashesHashDigest);

  assert(
    arraysAreEqual(passportData.eContent.slice(72, 72 + 32), concatenatedDataHashesHashDigest),
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
    signatureAlgorithm: SignatureAlgorithm[sigAlgFormatted].toString(),
    pubkey: splitToWords(
      BigInt(passportData.pubKey.modulus as string),
      BigInt(64),
      BigInt(32)
    ),
    pathIndices: proof.pathIndices.map(index => index.toString()),
    siblings: proof.siblings.flat().map(index => index.toString()),
    root: tree.root.toString(),
    address,
  }
}