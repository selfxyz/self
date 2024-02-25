import { poseidon12, poseidon2, poseidon8 } from "poseidon-lite"
import { SignatureAlgorithm, TREE_DEPTH } from "../constants/constants";
import { IMT } from '@zk-kit/imt'
import { bigIntToChunkedBytes, formatSigAlg } from "./utils";

export function buildPubkeyTree(pubkeys: any[]) {
  let leaves: bigint[] = []
  let startTime = performance.now();

  for(let i = 0; i < pubkeys.length; i++) {
    const pubkey = pubkeys[i]

    if (i % 3000 === 0 && i !== 0) {
      console.log('Processing pubkey number', i, "over", pubkeys.length);
    }

    const leaf = getLeaf(pubkey, i)

    if (!leaf) {
      // console.log('no leaf for this weird signature:', i, formatSigAlg(pubkey.signatureAlgorithm, pubkey.exponent))
      continue
    }
    leaves.push(leaf)
  }

  const tree = new IMT(poseidon2, TREE_DEPTH, 0, 2, leaves)
  console.log('pubkey tree built in', performance.now() - startTime, 'ms')

  return tree
}

export function getLeaf(pubkey: any, i?: number): bigint {
  const sigAlgFormatted = formatSigAlg(pubkey.signatureAlgorithm, pubkey.exponent)

  console.log('pubkey', pubkey)
  console.log('sigAlgFormatted', sigAlgFormatted)
  if (
    sigAlgFormatted === "sha256WithRSAEncryption_65537"
    || sigAlgFormatted === "sha256WithRSAEncryption_3"
    || sigAlgFormatted === "sha1WithRSAEncryption_65537"
    || sigAlgFormatted === "rsassaPss_65537"
    || sigAlgFormatted === "rsassaPss_3"
    || sigAlgFormatted === "sha512WithRSAEncryption_65537"
  ) {
    // Converting pubkey.modulus into 11 chunks of 192 bits, assuming it is originally 2048 bits.
    // This is because Poseidon circuit only supports an array of 16 elements, and field size is 254.
    const pubkeyChunked = bigIntToChunkedBytes(BigInt(pubkey.modulus), 192, 11);

    console.log('pubkeyChunked', pubkeyChunked.length, pubkeyChunked)
    try {
      // leaf is poseidon(signatureAlgorithm, ...pubkey)
      return poseidon12([SignatureAlgorithm[sigAlgFormatted], ...pubkeyChunked])
    } catch(err) {
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
    } catch(err) {
      console.log('err', err, i, sigAlgFormatted, pubkey)
    }
  }
}