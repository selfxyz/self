// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { poseidon2 } from 'poseidon-lite';

import {
  attributeToPosition,
  attributeToPosition_ID,
  DEFAULT_MAJORITY,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
} from '@selfxyz/common/constants';
import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import type { SelfApp, SelfAppDisclosureConfig } from '@selfxyz/common/utils';
import {
  calculateUserIdentifierHash,
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
  getCircuitNameFromPassportData,
  hashEndpointWithScope,
} from '@selfxyz/common/utils';

import { useProtocolStore } from '../../stores/protocolStore';

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';

export function generateTEEInputsDSC(
  passportData: PassportData,
  cscaTree: string[][],
  env: 'prod' | 'stg',
) {
  const inputs = generateCircuitInputsDSC(passportData, cscaTree);
  const circuitName = getCircuitNameFromPassportData(passportData, 'dsc');
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}

export function generateTEEInputsDisclose(
  secret: string,
  passportData: PassportData,
  selfApp: SelfApp,
) {
  const { scope, disclosures, endpoint, userId, userDefinedData, chainID } =
    selfApp;
  const userIdentifierHash = calculateUserIdentifierHash(
    chainID,
    userId,
    userDefinedData,
  );
  const scope_hash = hashEndpointWithScope(endpoint, scope);
  const document: DocumentCategory = passportData.documentCategory;

  const selector_dg1 = getSelectorDg1(document, disclosures);

  const majority = disclosures.minimumAge
    ? disclosures.minimumAge.toString()
    : DEFAULT_MAJORITY;
  const selector_older_than = disclosures.minimumAge ? '1' : '0';

  const selector_ofac = disclosures.ofac ? 1 : 0;

  const ofac_trees = useProtocolStore.getState()[document].ofac_trees;
  if (!ofac_trees) {
    throw new Error('OFAC trees not loaded');
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

  const serialized_tree = useProtocolStore.getState()[document].commitment_tree;
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
    userIdentifierHash.toString(),
  );
  return {
    inputs,
    circuitName:
      passportData.documentCategory === 'passport'
        ? 'vc_and_disclose'
        : 'vc_and_disclose_id',
    endpointType: selfApp.endpointType,
    endpoint: selfApp.endpoint,
  };
}

export function generateTEEInputsRegister(
  secret: string,
  passportData: PassportData,
  dscTree: string,
  env: 'prod' | 'stg',
) {
  const inputs = generateCircuitInputsRegister(secret, passportData, dscTree);
  const circuitName = getCircuitNameFromPassportData(passportData, 'register');
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  const endpoint = 'https://self.xyz';
  return { inputs, circuitName, endpointType, endpoint };
}

/*** DISCLOSURE ***/

function getSelectorDg1(
  document: DocumentCategory,
  disclosures: SelfAppDisclosureConfig,
) {
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
      const [start, end] =
        attributeToPosition[attribute as keyof typeof attributeToPosition];
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
      const [start, end] =
        attributeToPosition_ID[
          attribute as keyof typeof attributeToPosition_ID
        ];
      selector_dg1.fill('1', start, end + 1);
    }
  });
  return selector_dg1;
}
