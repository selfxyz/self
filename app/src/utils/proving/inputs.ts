import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { poseidon2 } from 'poseidon-lite';

import nameAndDobSMTData from '../../../../common/ofacdata/outputs/nameAndDobSMT.json';
import nameAndYobSMTData from '../../../../common/ofacdata/outputs/nameAndYobSMT.json';
import passportNoAndNationalitySMTData from '../../../../common/ofacdata/outputs/passportNoAndNationalitySMT.json';
import {
  DEFAULT_MAJORITY,
  PASSPORT_ATTESTATION_ID,
  attributeToPosition,
} from '../../../../common/src/constants/constants';
import { EndpointType, SelfApp } from '../../../../common/src/utils/appType';
import { getCircuitNameFromPassportData } from '../../../../common/src/utils/circuits/circuitsName';
import {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from '../../../../common/src/utils/circuits/generateInputs';
import {
  getCSCATree,
  getCommitmentTree,
  getDSCTree,
} from '../../../../common/src/utils/trees';
import { PassportData } from '../../../../common/src/utils/types';

export async function generateTeeInputsRegister(
  secret: string,
  passportData: PassportData,
  endpointType: EndpointType,
) {
  const serialized_dsc_tree = await getDSCTree(endpointType);
  const inputs = generateCircuitInputsRegister(
    secret,
    passportData,
    serialized_dsc_tree,
  );
  const circuitName = getCircuitNameFromPassportData(passportData, 'register');
  if (circuitName == null) {
    throw new Error('Circuit name is null');
  }
  return { inputs, circuitName };
}

export async function generateTeeInputsDsc(
  passportData: PassportData,
  endpointType: EndpointType,
) {
  const serialized_csca_tree = await getCSCATree(endpointType);
  const inputs = generateCircuitInputsDSC(
    passportData.dsc,
    serialized_csca_tree,
  );
  const circuitName = getCircuitNameFromPassportData(passportData, 'dsc');
  if (circuitName == null) {
    throw new Error('Circuit name is null');
  }
  return { inputs, circuitName };
}

export async function generateTeeInputsVCAndDisclose(
  secret: string,
  passportData: PassportData,
  selfApp: SelfApp,
) {
  const { scope, userId, disclosures } = selfApp;

  const selector_dg1 = Array(88).fill('0');

  Object.entries(disclosures).forEach(([attribute, reveal]) => {
    if (['ofac', 'excludedCountries', 'minimumAge'].includes(attribute)) {
      return;
    }
    if (reveal) {
      const [start, end] =
        attributeToPosition[attribute as keyof typeof attributeToPosition];
      selector_dg1.fill('1', start, end + 1);
    }
  });

  const majority = disclosures.minimumAge
    ? disclosures.minimumAge.toString()
    : DEFAULT_MAJORITY;
  const selector_older_than = disclosures.minimumAge ? '1' : '0';

  const selector_ofac = disclosures.ofac ? 1 : 0;

  const { passportNoAndNationalitySMT, nameAndDobSMT, nameAndYobSMT } =
    await getOfacSMTs();
  const serialized_tree = await getCommitmentTree(passportData.documentType);
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serialized_tree);
  console.log('tree', tree);
  // const commitment = generateCommitment(
  //   secret,
  //   PASSPORT_ATTESTATION_ID,
  //   passportData,
  // );
  // tree.insert(BigInt(commitment));
  // Uncomment to add artificially the commitment to the tree

  const inputs = generateCircuitInputsVCandDisclose(
    secret,
    PASSPORT_ATTESTATION_ID,
    passportData,
    scope,
    selector_dg1,
    selector_older_than,
    tree,
    majority,
    passportNoAndNationalitySMT,
    nameAndDobSMT,
    nameAndYobSMT,
    selector_ofac,
    disclosures.excludedCountries ?? [],
    userId,
  );
  return { inputs, circuitName: 'vc_and_disclose' };
}

/*** DISCLOSURE ***/

async function getOfacSMTs() {
  // TODO: get the SMT from an endpoint
  const passportNoAndNationalitySMT = new SMT(poseidon2, true);
  passportNoAndNationalitySMT.import(passportNoAndNationalitySMTData);
  const nameAndDobSMT = new SMT(poseidon2, true);
  nameAndDobSMT.import(nameAndDobSMTData);
  const nameAndYobSMT = new SMT(poseidon2, true);
  nameAndYobSMT.import(nameAndYobSMTData);
  return { passportNoAndNationalitySMT, nameAndDobSMT, nameAndYobSMT };
}
