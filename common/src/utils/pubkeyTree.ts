import { poseidon10, poseidon2, poseidon3, poseidon5, poseidon6, poseidon8 } from 'poseidon-lite';
import { SignatureAlgorithm, PUBKEY_TREE_DEPTH } from '../constants/constants';
import { IMT } from '@zk-kit/imt';
import { BigintToArray, hexToDecimal, splitToWords } from './utils';
import { formatSigAlgNameForCircuit } from './utils';
import { toStandardName } from './formatNames';

export function buildPubkeyTree(pubkeys: any[]) {
  let leaves: bigint[] = [];
  let startTime = performance.now();

  for (let i = 0; i < pubkeys.length; i++) {
    const pubkey = pubkeys[i];

    if (i % 3000 === 0 && i !== 0) {
      console.log('Processing pubkey number', i, 'over', pubkeys.length);
    }

    const leaf = getLeaf(pubkey, i);

    if (!leaf) {
      // console.log('no leaf for this weird signature:', i, formatSigAlgNameForCircuit(pubkey.signatureAlgorithm, pubkey.exponent))
      continue;
    }
    leaves.push(leaf);
  }

  const tree = new IMT(poseidon2, PUBKEY_TREE_DEPTH, 0, 2, leaves);
  console.log('pubkey tree built in', performance.now() - startTime, 'ms');

  return tree;
}

export function getLeaf(pubkey: any, i?: number): bigint {
  if (!pubkey?.modulus && pubkey?.pubKey?.modulus) {
    pubkey.modulus = pubkey.pubKey.modulus;
    pubkey.exponent = pubkey.pubKey.exponent;
  }
  if (!pubkey?.publicKeyQ && pubkey?.pubKey?.publicKeyQ) {
    pubkey.publicKeyQ = pubkey.pubKey.publicKeyQ;
  }
  const sigAlgFormatted = toStandardName(pubkey.signatureAlgorithm);
  const sigAlgFormattedForCircuit = formatSigAlgNameForCircuit(sigAlgFormatted, pubkey.exponent);
  if (
    sigAlgFormattedForCircuit === 'sha256WithRSAEncryption_65537' ||
    sigAlgFormattedForCircuit === 'sha256WithRSAEncryption_3' ||
    sigAlgFormattedForCircuit === 'sha1WithRSAEncryption_65537' ||
    sigAlgFormattedForCircuit === 'sha256WithRSASSAPSS_65537' ||
    sigAlgFormattedForCircuit === 'sha256WithRSASSAPSS_3' ||
    sigAlgFormattedForCircuit === 'sha512WithRSAEncryption_65537'
  ) {
    const pubkeyChunked = splitToWords(BigInt(pubkey.modulus), BigInt(230), BigInt(9));
    const leaf = poseidon10([SignatureAlgorithm[sigAlgFormattedForCircuit], ...pubkeyChunked]);
    try {
      return leaf;
    } catch (err) {
      console.log('err', err, i, sigAlgFormattedForCircuit, pubkey);
    }
  } else if (
    sigAlgFormattedForCircuit === 'ecdsa_with_SHA1' ||
    sigAlgFormattedForCircuit === 'ecdsa_with_SHA224' ||
    sigAlgFormattedForCircuit === 'ecdsa_with_SHA384' ||
    sigAlgFormattedForCircuit === 'ecdsa_with_SHA256' ||
    sigAlgFormattedForCircuit === 'ecdsa_with_SHA512'
  ) {
    try {
      if (!pubkey.publicKeyQ) {
        throw new Error('publicKeyQ is undefined');
      }

      const [x, y, a, p] = pubkey.publicKeyQ.replace(/[()]/g, '').split(',');

      if (!x || !y) {
        throw new Error('Invalid publicKeyQ format');
      }

      let qx = BigintToArray(43, 6, BigInt(hexToDecimal(x)));
      let qy = BigintToArray(43, 6, BigInt(hexToDecimal(y)));

      let poseidon_hasher_dsc_modules_x = poseidon6(qx);
      let poseidon_hasher_dsc_modules_y = poseidon6(qy);

      return poseidon3([
        SignatureAlgorithm[sigAlgFormattedForCircuit],
        poseidon_hasher_dsc_modules_x, // pub.x
        poseidon_hasher_dsc_modules_y, // pub.y
        // pubkey.b ? pubkey.b : BigInt(0), // null then 0
        // pubkey.generator ? pubkey.generator : BigInt(0), // null then 0
        // pubkey.order ? pubkey.order : BigInt(0), // null then 0
        // pubkey.cofactor ? pubkey.cofactor : BigInt(0), // null then 0
      ]);
    } catch (err) {
      console.log('err', err, i, sigAlgFormattedForCircuit, pubkey);
    }
  }
}
