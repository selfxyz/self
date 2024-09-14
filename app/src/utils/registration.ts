import axios from "axios";
import { COMMITMENT_TREE_TRACKER_URL, PASSPORT_ATTESTATION_ID } from "../../../common/src/constants/constants";
import { LeanIMT } from "@zk-kit/imt";
import { poseidon2, poseidon6 } from "poseidon-lite";
import { PassportData } from "../../../common/src/utils/types";
import { getLeaf } from "../../../common/src/utils/pubkeyTree";
import { formatMrz, packBytes } from "../../../common/src/utils/utils";
import { findIndexInTree } from "../../../common/src/utils/generateInputs";

export async function isCommitmentRegistered(secret: string, passportData: PassportData) {


  let response;
  console.log(COMMITMENT_TREE_TRACKER_URL)
  try {
    response = await axios.get(COMMITMENT_TREE_TRACKER_URL);
  } catch (error) {
    console.error('Error fetching commitment tree:', error);
    throw error; // rethrow the error after logging
  }
  console.log('response.data:', response.data);

  const imt = new LeanIMT(
    (a: bigint, b: bigint) => poseidon2([a, b]),
    []
  );

  imt.import(response.data);

  const pubkey_leaf = getLeaf(passportData);

  const formattedMrz = formatMrz(passportData.mrz);
  const mrz_bytes = packBytes(formattedMrz);
  const commitment = poseidon6([
    secret,
    PASSPORT_ATTESTATION_ID,
    pubkey_leaf,
    mrz_bytes[0],
    mrz_bytes[1],
    mrz_bytes[2]
  ]);

  console.log('commitment', commitment.toString());

  try {
    findIndexInTree(imt as any, commitment); // this will throw if not found
    return true
  } catch (err) {
    return false;
  }
}