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
import { SelfApp } from '../../../../common/src/utils/appType';
import {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from '../../../../common/src/utils/circuits/generateInputs';
import { hashEndpointWithScope } from '../../../../common/src/utils/scope';
import { PassportData } from '../../../../common/src/utils/types';

export function generateTeeInputsRegister(
  secret: string,
  passportData: PassportData,
  dscTree: string,
) {
  return generateCircuitInputsRegister(secret, passportData, dscTree);
}

export function generateTeeInputsDsc(
  passportData: PassportData,
  cscaTree: string[][],
) {
  return generateCircuitInputsDSC(passportData.dsc, cscaTree);
}

export function generateTeeInputsVCAndDisclose(
  secret: string,
  passportData: PassportData,
  selfApp: SelfApp,
  passportTree: string,
) {
  const { scope, userId, disclosures, endpoint } = selfApp;
  const scope_hash = hashEndpointWithScope(endpoint, scope);
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
    getOfacSMTs();
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), passportTree);
  console.log('tree', tree);
  // const commitment = generateCommitment(
  //   secret,
  //   PASSPORT_ATTESTATION_ID,
  //   passportData,
  // );
  // tree.insert(BigInt(commitment));
  // Uncomment to add artificially the commitment to the tree

  return generateCircuitInputsVCandDisclose(
    secret,
    PASSPORT_ATTESTATION_ID,
    passportData,
    scope_hash,
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
}

/*** DISCLOSURE ***/

function getOfacSMTs() {
  // TODO: get the SMT from an endpoint
  const passportNoAndNationalitySMT = new SMT(poseidon2, true);
  passportNoAndNationalitySMT.import(passportNoAndNationalitySMTData);
  const nameAndDobSMT = new SMT(poseidon2, true);
  nameAndDobSMT.import(nameAndDobSMTData);
  const nameAndYobSMT = new SMT(poseidon2, true);
  nameAndYobSMT.import(nameAndYobSMTData);
  return { passportNoAndNationalitySMT, nameAndDobSMT, nameAndYobSMT };
}
