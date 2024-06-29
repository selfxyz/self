import { poseidon10, poseidon2, poseidon8 } from "poseidon-lite"
import { SignatureAlgorithm, PUBKEY_TREE_DEPTH } from "../constants/constants";
import { IMT } from '@zk-kit/imt'
import { splitToWords } from "./utils";
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

  if (
    sigAlgFormattedForCircuit === "sha256WithRSAEncryption_65537"
    || sigAlgFormattedForCircuit === "sha256WithRSAEncryption_3"
    || sigAlgFormattedForCircuit === "sha1WithRSAEncryption_65537"
    || sigAlgFormattedForCircuit === "sha256WithRSASSAPSS_65537"
    || sigAlgFormattedForCircuit === "sha256WithRSASSAPSS_3"
    || sigAlgFormattedForCircuit === "sha512WithRSAEncryption_65537"
  ) {
    const pubkeyChunked = splitToWords(BigInt(pubkey.modulus), BigInt(230), BigInt(9));
    try {
      const leaf = poseidon10([SignatureAlgorithm[sigAlgFormatted], ...pubkeyChunked])
      return leaf
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
