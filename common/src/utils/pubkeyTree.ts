import { PUBKEY_TREE_DEPTH, COMMITMENT_TREE_TRACKER_URL, SignatureAlgorithmIndex } from "../constants/constants";
import { LeanIMT } from '@zk-kit/imt'
import axios from "axios";
import { poseidon10, poseidon2, poseidon3, poseidon6 } from 'poseidon-lite';
import { hexToDecimal, splitToWords } from './utils';
import { PassportData } from "./types";
import { parseDSC } from "./handleCertificate";

export function getLeaf(passportData: PassportData): bigint {
  const { signatureAlgorithm, hashFunction, modulus, x, y } = parseDSC(passportData.dsc);
  const sigAlgIndex = SignatureAlgorithmIndex[`${signatureAlgorithm}_${hashFunction}`]

  if (signatureAlgorithm === 'ecdsa') {
    let qx = splitToWords(BigInt(hexToDecimal(x)), 43, 6);
    let qy = splitToWords(BigInt(hexToDecimal(y)), 43, 6);

    let x_hash = poseidon6(qx);
    let y_hash = poseidon6(qy);

    return poseidon3([
      sigAlgIndex,
      x_hash,
      y_hash,
    ]);
  } else {
    const pubkeyChunked = splitToWords(BigInt(hexToDecimal(modulus)), 230, 9);

    return poseidon10([
      sigAlgIndex,
      ...pubkeyChunked
    ]);
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