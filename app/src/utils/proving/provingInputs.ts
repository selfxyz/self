import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import {
  attributeToPosition,
  DEFAULT_MAJORITY,
  PASSPORT_ATTESTATION_ID,
} from '@selfxyz/common';
import { SelfApp } from '@selfxyz/common';
import { getCircuitNameFromPassportData } from '@selfxyz/common';
import {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from '@selfxyz/common';
import { hashEndpointWithScope } from '@selfxyz/common';
import { PassportData } from '@selfxyz/common';
import nameAndDobSMTData from '@selfxyz/common/ofacdata/outputs/nameAndDobSMT.json';
import nameAndYobSMTData from '@selfxyz/common/ofacdata/outputs/nameAndYobSMT.json';
import passportNoAndNationalitySMTData from '@selfxyz/common/ofacdata/outputs/passportNoAndNationalitySMT.json';
import { poseidon2 } from 'poseidon-lite';

import { useProtocolStore } from '../../stores/protocolStore';

export function generateTEEInputsRegister(
  secret: string,
  passportData: PassportData,
  dscTree: string,
) {
  const inputs = generateCircuitInputsRegister(secret, passportData, dscTree);
  const circuitName = getCircuitNameFromPassportData(passportData, 'register');
  const endpointType =
    passportData.documentType && passportData.documentType !== 'passport'
      ? 'staging_celo'
      : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}

export function generateTEEInputsDSC(
  passportData: PassportData,
  cscaTree: string[][],
) {
  const inputs = generateCircuitInputsDSC(passportData, cscaTree);
  const circuitName = getCircuitNameFromPassportData(passportData, 'dsc');
  const endpointType =
    passportData.documentType && passportData.documentType !== 'passport'
      ? 'staging_celo'
      : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}

export function generateTEEInputsDisclose(
  secret: string,
  passportData: PassportData,
  selfApp: SelfApp,
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
  const serialized_tree = useProtocolStore.getState().passport.commitment_tree;
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serialized_tree);

  const inputs = generateCircuitInputsVCandDisclose(
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
  return {
    inputs,
    circuitName: 'vc_and_disclose',
    endpointType: selfApp.endpointType,
    endpoint: selfApp.endpoint,
  };
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
