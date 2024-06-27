import { poseidon12, poseidon2, poseidon8 } from "poseidon-lite"
import { SignatureAlgorithm, PUBKEY_TREE_DEPTH } from "../constants/constants";
import { IMT } from '@zk-kit/imt'
import { bigIntToChunkedBytes, formatSigAlgNameForCircuit } from "./utils";
import { toStandardName } from "./formatNames";

export function buildPubkeyTree(pubkeys: any[]) {
  let leaves: bigint[] = []
  let startTime = performance.now();

  for (let i = 0; i < pubkeys.length; i++) {
    const pubkey = pubkeys[i]

    if (i % 3000 === 0 && i !== 0) {
      console.log('Processing pubkey number', i, "over", pubkeys.length);
    }

    const leaf = getLeaf(pubkey, i)

    if (!leaf) {
      // console.log('no leaf for this weird signature:', i, formatSigAlgNameForCircuit(pubkey.signatureAlgorithm, pubkey.exponent))
      continue
    }
    leaves.push(leaf)
  }

  const tree = new IMT(poseidon2, PUBKEY_TREE_DEPTH, 0, 2, leaves)
  console.log('pubkey tree built in', performance.now() - startTime, 'ms')

  return tree
}

export function getLeaf(pubkey: any, i?: number): bigint {
  if (!pubkey?.modulus && pubkey?.pubKey?.modulus) {
    pubkey.modulus = pubkey.pubKey.modulus
    pubkey.exponent = pubkey.pubKey.exponent
  }
  if (!pubkey?.publicKeyQ && pubkey?.pubKey?.publicKeyQ) {
    pubkey.publicKeyQ = pubkey.pubKey.publicKeyQ
  }

  const sigAlgFormatted = toStandardName(pubkey.signatureAlgorithm)
  const sigAlgFormattedForCircuit = formatSigAlgNameForCircuit(sigAlgFormatted, pubkey.exponent)

  // console.log('pubkey', pubkey)
  // console.log('sigAlgFormatted', sigAlgFormatted)
  if (
    sigAlgFormattedForCircuit === "sha256WithRSAEncryption_65537"
    || sigAlgFormattedForCircuit === "sha256WithRSAEncryption_3"
    || sigAlgFormattedForCircuit === "sha1WithRSAEncryption_65537"
    || sigAlgFormattedForCircuit === "sha256WithRSASSAPSS_65537"
    || sigAlgFormattedForCircuit === "sha256WithRSASSAPSS_3"
    || sigAlgFormattedForCircuit === "sha512WithRSAEncryption_65537"
  ) {
    // Converting pubkey.modulus into 11 chunks of 192 bits, assuming it is originally 2048 bits.
    // This is because Poseidon circuit only supports an array of 16 elements, and field size is 254.
    const pubkeyChunked = bigIntToChunkedBytes(BigInt(pubkey.modulus), 192, 11);

    // console.log('pubkeyChunked', pubkeyChunked.length, pubkeyChunked)
    try {
      // leaf is poseidon(signatureAlgorithm, ...pubkey)
      return poseidon12([SignatureAlgorithm[sigAlgFormattedForCircuit], ...pubkeyChunked])
    } catch (err) {
      console.log('err', err, i, sigAlgFormattedForCircuit, pubkey)
    }
  } else if (
    sigAlgFormattedForCircuit === "ecdsa_with_SHA1"
    || sigAlgFormattedForCircuit === "ecdsa_with_SHA224"
    || sigAlgFormattedForCircuit === "ecdsa_with_SHA384"
    || sigAlgFormattedForCircuit === "ecdsa_with_SHA256"
    || sigAlgFormattedForCircuit === "ecdsa_with_SHA512"
  ) {
    try {
      // this will be replaced by just X and Y or pubkey in publicKeyQ
      return poseidon8([SignatureAlgorithm[sigAlgFormattedForCircuit], pubkey.pub, pubkey.prime, pubkey.a, pubkey.b, pubkey.generator, pubkey.order, pubkey.cofactor])
    } catch (err) {
      console.log('err', err, i, sigAlgFormattedForCircuit, pubkey)
    }
  }
}