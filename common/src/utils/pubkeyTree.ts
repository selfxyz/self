import { PUBKEY_TREE_DEPTH, COMMITMENT_TREE_TRACKER_URL, SignatureAlgorithmIndex } from "../constants/constants";
import { LeanIMT } from '@zk-kit/imt'
import axios from "axios";
import { poseidon16, poseidon2 } from 'poseidon-lite';
import { hexToDecimal, splitToWords } from './utils';
import { parseCertificate } from "./certificates/handleCertificate";
import { flexiblePoseidon } from "./poseidon";

export function leafHasherLight(pubKeyFormatted: string[]) {
  const rounds = Math.ceil(pubKeyFormatted.length / 16);
  const hash = new Array(rounds);
  for (let i = 0; i < rounds; i++) {
    hash[i] = { inputs: new Array(16).fill(BigInt(0)) };
  }
  for (let i = 0; i < rounds; i++) {
    for (let j = 0; j < 16; j++) {
      if (i * 16 + j < pubKeyFormatted.length) {
        hash[i].inputs[j] = BigInt(pubKeyFormatted[i * 16 + j]);
      }
    }
  }
  const finalHash = flexiblePoseidon(hash.map(h => poseidon16(h.inputs)));
  return finalHash.toString();
}

export function getLeaf(dsc: string, n: number, k: number): string {
  const { signatureAlgorithm, hashFunction, modulus, x, y, bits, curve, exponent } = parseCertificate(dsc);
  console.log(`${signatureAlgorithm}_${curve || exponent}_${hashFunction}_${bits}`)
  const sigAlgIndex = SignatureAlgorithmIndex[`${signatureAlgorithm}_${curve || exponent}_${hashFunction}_${bits}`]
  if (sigAlgIndex === undefined) {
    throw new Error(`Signature algorithm not found: ${signatureAlgorithm}_${curve || exponent}_${hashFunction}_${bits}`)
  }

  if (signatureAlgorithm === 'ecdsa') {
    let qx = splitToWords(BigInt(hexToDecimal(x)), n, k);
    let qy = splitToWords(BigInt(hexToDecimal(y)), n, k);
    return leafHasherLight([sigAlgIndex, ...qx, ...qy])

  } else {
    const pubkeyChunked = splitToWords(BigInt(hexToDecimal(modulus)), n, k);
    return leafHasherLight([sigAlgIndex, ...pubkeyChunked]);
  }
}

export async function getTreeFromTracker(): Promise<LeanIMT> {
  const response = await axios.get(COMMITMENT_TREE_TRACKER_URL)
  const imt = new LeanIMT(
    (a: bigint, b: bigint) => poseidon2([a, b]),
    []
  );
  imt.import(response.data)
  return imt
}