import { poseidon2 } from 'poseidon-lite';

import {
  AADHAAR_ATTESTATION_ID,
  attributeToPosition,
  attributeToPosition_ID,
  DEFAULT_MAJORITY,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
} from '../../constants/constants.js';
import type { DocumentCategory, PassportData } from '../../types/index.js';
import type { SelfApp, SelfAppDisclosureConfig } from '../../utils/appType.js';
import {
  calculateUserIdentifierHash,
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
  getCircuitNameFromPassportData,
  hashEndpointWithScope,
} from '../../utils/index.js';
import type { AadhaarData, Environment, IDDocument, OfacTree } from '../../utils/types.js';

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';

export { generateCircuitInputsRegister } from './generateInputs.js';

export function generateTEEInputsAadhaarDisclose(
  secret: string,
  aadhaarData: AadhaarData,
  selfApp: SelfApp,
  getTree: <T extends 'ofac' | 'commitment'>(
    doc: DocumentCategory,
    tree: T
  ) => T extends 'ofac' ? OfacTree : any
) {
  const { prepareAadhaarDiscloseData } = require('../aadhaar/mockData.js');
  const { scope, disclosures, endpoint, userId, userDefinedData, chainID } = selfApp;
  const userIdentifierHash = calculateUserIdentifierHash(chainID, userId, userDefinedData);
  const scope_hash = hashEndpointWithScope(endpoint, scope);

  const ofac_trees = getTree('aadhaar', 'ofac');
  if (!ofac_trees) {
    throw new Error('OFAC trees not loaded');
  }

  if (!ofac_trees.nameAndDob || !ofac_trees.nameAndYob) {
    throw new Error('Invalid OFAC tree structure: missing required fields');
  }

  const nameAndDobSMT = new SMT(poseidon2, true);
  const nameAndYobSMT = new SMT(poseidon2, true);
  nameAndDobSMT.import(ofac_trees.nameAndDob);
  nameAndYobSMT.import(ofac_trees.nameAndYob);

  const serialized_tree = getTree('aadhaar', 'commitment');
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serialized_tree);

  const inputs = prepareAadhaarDiscloseData(
    aadhaarData.qrData,
    tree,
    nameAndDobSMT,
    nameAndYobSMT,
    scope_hash,
    secret,
    userIdentifierHash.toString(),
    {
      dateOfBirth: disclosures.date_of_birth,
      name: disclosures.name,
      gender: disclosures.gender,
      idNumber: disclosures.passport_number,
      issuingState: disclosures.issuing_state,
      minimumAge: disclosures.minimumAge,
      forbiddenCountriesListPacked: disclosures.excludedCountries,
      ofac: disclosures.ofac,
    }
  );

  return {
    inputs,
    circuitName: 'vc_and_disclose_aadhaar',
    endpointType: selfApp.endpointType,
    endpoint: selfApp.endpoint,
  };
}

export async function generateTEEInputsAadhaarRegister(
  secret: string,
  aadhaarData: AadhaarData,
  publicKeys: string[],
  env: Environment
) {
  const { prepareAadhaarRegisterData } = require('../aadhaar/mockData.js');
  console.log(
    'publicKeys-aadhaar',
    publicKeys,
    'secret-aadhaar',
    secret,
    'aadhaarData-aadhaar',
    aadhaarData
  );
  const inputs = await prepareAadhaarRegisterData(aadhaarData.qrData, secret, publicKeys);
  const circuitName = 'register_aadhaar';
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}

export function generateTEEInputsDSC(
  passportData: PassportData,
  cscaTree: string[][],
  env: 'prod' | 'stg'
) {
  const inputs = generateCircuitInputsDSC(passportData, cscaTree);
  const circuitName = getCircuitNameFromPassportData(passportData, 'dsc');
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}

/*** DISCLOSURE ***/

function getSelectorDg1(document: DocumentCategory, disclosures: SelfAppDisclosureConfig) {
  switch (document) {
    case 'passport':
      return getSelectorDg1Passport(disclosures);
    case 'id_card':
      return getSelectorDg1IdCard(disclosures);
  }
}

function getSelectorDg1Passport(disclosures: SelfAppDisclosureConfig) {
  const selector_dg1 = Array(88).fill('0');
  Object.entries(disclosures).forEach(([attribute, reveal]) => {
    if (['ofac', 'excludedCountries', 'minimumAge'].includes(attribute)) {
      return;
    }
    if (reveal) {
      const [start, end] = attributeToPosition[attribute as keyof typeof attributeToPosition];
      selector_dg1.fill('1', start, end + 1);
    }
  });
  return selector_dg1;
}

function getSelectorDg1IdCard(disclosures: SelfAppDisclosureConfig) {
  const selector_dg1 = Array(90).fill('0');
  Object.entries(disclosures).forEach(([attribute, reveal]) => {
    if (['ofac', 'excludedCountries', 'minimumAge'].includes(attribute)) {
      return;
    }
    if (reveal) {
      const [start, end] = attributeToPosition_ID[attribute as keyof typeof attributeToPosition_ID];
      selector_dg1.fill('1', start, end + 1);
    }
  });
  return selector_dg1;
}

export function generateTEEInputsDiscloseStateless(
  secret: string,
  passportData: IDDocument,
  selfApp: SelfApp,
  getTree: <T extends 'ofac' | 'commitment'>(
    doc: DocumentCategory,
    tree: T
  ) => T extends 'ofac' ? OfacTree : any
) {
  if (passportData.documentCategory === 'aadhaar') {
    const { inputs, circuitName, endpointType, endpoint } = generateTEEInputsAadhaarDisclose(
      secret,
      passportData,
      selfApp,
      getTree
    );
    return { inputs, circuitName, endpointType, endpoint };
  }
  const { scope, disclosures, endpoint, userId, userDefinedData, chainID } = selfApp;
  const userIdentifierHash = calculateUserIdentifierHash(chainID, userId, userDefinedData);
  const scope_hash = hashEndpointWithScope(endpoint, scope);
  const document: DocumentCategory = passportData.documentCategory;

  const selector_dg1 = getSelectorDg1(document, disclosures);

  const majority = disclosures.minimumAge ? disclosures.minimumAge.toString() : DEFAULT_MAJORITY;
  const selector_older_than = disclosures.minimumAge ? '1' : '0';

  const selector_ofac = disclosures.ofac ? 1 : 0;

  const ofac_trees = getTree(document, 'ofac');
  if (!ofac_trees) {
    throw new Error('OFAC trees not loaded');
  }

  // Validate OFAC tree structure
  if (!ofac_trees.nameAndDob || !ofac_trees.nameAndYob) {
    throw new Error('Invalid OFAC tree structure: missing required fields');
  }
  if (document === 'passport' && !ofac_trees.passportNoAndNationality) {
    throw new Error('Invalid OFAC tree structure: missing passportNoAndNationality for passport');
  }

  let passportNoAndNationalitySMT: SMT | null = null;
  const nameAndDobSMT = new SMT(poseidon2, true);
  const nameAndYobSMT = new SMT(poseidon2, true);
  if (document === 'passport') {
    passportNoAndNationalitySMT = new SMT(poseidon2, true);
    passportNoAndNationalitySMT.import(ofac_trees.passportNoAndNationality);
  }
  nameAndDobSMT.import(ofac_trees.nameAndDob);
  nameAndYobSMT.import(ofac_trees.nameAndYob);

  const serialized_tree = getTree(document, 'commitment');
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serialized_tree);
  const inputs = generateCircuitInputsVCandDisclose(
    secret,
    document === 'passport' ? PASSPORT_ATTESTATION_ID : ID_CARD_ATTESTATION_ID,
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
    userIdentifierHash.toString()
  );
  return {
    inputs,
    circuitName:
      passportData.documentCategory === 'passport' ? 'vc_and_disclose' : 'vc_and_disclose_id',
    endpointType: selfApp.endpointType,
    endpoint: selfApp.endpoint,
  };
}

export async function generateTEEInputsRegister(
  secret: string,
  passportData: IDDocument,
  dscTree: string | string[],
  env: 'prod' | 'stg'
) {
  if (passportData.documentCategory === 'aadhaar') {
    const { inputs, circuitName, endpointType, endpoint } = await generateTEEInputsAadhaarRegister(
      secret,
      passportData,
      dscTree as string[],
      env
    );
    return { inputs, circuitName, endpointType, endpoint };
  }

  const inputs = generateCircuitInputsRegister(secret, passportData, dscTree as string);
  const circuitName = getCircuitNameFromPassportData(passportData, 'register');
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}
