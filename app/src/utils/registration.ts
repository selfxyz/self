import { LeanIMT, LeanIMTHashFunction } from '@openpassport/zk-kit-lean-imt';
import axios from 'axios';
import { poseidon2 } from 'poseidon-lite';

import {
  COMMITMENT_TREE_TRACKER_URL,
  PASSPORT_ATTESTATION_ID,
} from '../../../common/src/constants/constants';
import { findIndexInTree } from '../../../common/src/utils/generateInputs';
import {
  generateCommitment,
  getLeaf,
} from '../../../common/src/utils/pubkeyTree';
import { PassportData } from '../../../common/src/utils/types';
import { formatMrz, packBytes } from '../../../common/src/utils/utils';

export async function isCommitmentRegistered(
  secret: string,
  passportData: PassportData,
) {
  let response;

  console.log(COMMITMENT_TREE_TRACKER_URL);
  try {
    response = await axios.get(COMMITMENT_TREE_TRACKER_URL);
  } catch (error) {
    console.error('Error fetching commitment tree:', error);
    throw error; // rethrow the error after logging
  }
  console.log('response.data:', response.data);

  const hashFunction: LeanIMTHashFunction = (a: bigint, b: bigint) =>
    poseidon2([a, b]);
  const imt = LeanIMT.import(hashFunction, response.data);

  const pubkey_leaf = getLeaf(passportData.dsc);

  const formattedMrz = formatMrz(passportData.mrz);
  const mrz_bytes = packBytes(formattedMrz);
  const commitment = generateCommitment(
    secret,
    PASSPORT_ATTESTATION_ID,
    pubkey_leaf,
    mrz_bytes,
    passportData.dg2Hash?.map(x => x.toString()) || [],
  );

  console.log('commitment', commitment.toString());

  try {
    findIndexInTree(imt as any, commitment); // this will throw if not found
    return true;
  } catch (err) {
    return false;
  }
}
