import { poseidon10, poseidon2, poseidon8 } from "poseidon-lite"
import { SignatureAlgorithm, PUBKEY_TREE_DEPTH } from "../constants/constants";
import { IMT } from '@zk-kit/imt'
import { formatSigAlg, splitToWords } from "./utils";

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
      console.log('ERROR: no leaf for this signature:', i, formatSigAlg(pubkey.signatureAlgorithm, pubkey.exponent))
      continue
    }
    leaves.push(leaf)
  }

  const tree = new IMT(poseidon2, PUBKEY_TREE_DEPTH, 0, 2, leaves)
  console.log('pubkey tree built in', performance.now() - startTime, 'ms')

  return tree
}

export function getLeaf(pubkey: any, i?: number): bigint {
  const sigAlgFormatted = formatSigAlg(pubkey.signatureAlgorithm, pubkey.exponent)

  if (
    sigAlgFormatted === "sha256WithRSAEncryption_65537"
    || sigAlgFormatted === "sha256WithRSAEncryption_3"
    || sigAlgFormatted === "sha1WithRSAEncryption_65537"
    || sigAlgFormatted === "rsassaPss_65537"
    || sigAlgFormatted === "rsassaPss_3"
    || sigAlgFormatted === "sha512WithRSAEncryption_65537"
  ) {
    const pubkeyChunked = splitToWords(BigInt(pubkey.modulus), BigInt(230), BigInt(9));
    try {
      const leaf = poseidon10([SignatureAlgorithm[sigAlgFormatted], ...pubkeyChunked])
      return leaf
    } catch (err) {
      console.log('err', err, i, sigAlgFormatted, pubkey)
    }
  } else if (
    sigAlgFormatted === "ecdsa_with_SHA1"
    || sigAlgFormatted === "ecdsa_with_SHA384"
    || sigAlgFormatted === "ecdsa_with_SHA256"
    || sigAlgFormatted === "ecdsa_with_SHA512"
  ) {
    try {
      return poseidon8([SignatureAlgorithm[sigAlgFormatted], pubkey.pub, pubkey.prime, pubkey.a, pubkey.b, pubkey.generator, pubkey.order, pubkey.cofactor])
    } catch (err) {
      console.log('err', err, i, sigAlgFormatted, pubkey)
    }
  }
}
