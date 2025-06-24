// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import {
  attributeToPosition,
  attributeToPosition_ID,
  DEFAULT_MAJORITY,
  DocumentCategory,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
  SelfAppDisclosureConfig,
} from '@selfxyz/common';
import { SelfApp } from '@selfxyz/common';
import { getCircuitNameFromPassportData } from '@selfxyz/common';
import {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from '@selfxyz/common';
import { hashEndpointWithScope } from '@selfxyz/common';
import { calculateUserIdentifierHash } from '@selfxyz/common';
import { PassportData } from '@selfxyz/common';
import nameAndDobSMTData from '@selfxyz/common/ofacdata/outputs/nameAndDobSMT.json';
import nameAndDobSMTDataID from '@selfxyz/common/ofacdata/outputs/nameAndDobSMT_ID.json';
import nameAndYobSMTData from '@selfxyz/common/ofacdata/outputs/nameAndYobSMT.json';
import nameAndYobSMTDataID from '@selfxyz/common/ofacdata/outputs/nameAndYobSMT_ID.json';
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

  const {
    passportNoAndNationalitySMT,
    nameAndDobSMT,
    nameAndYobSMT,
    nameAndDobSMTID,
    nameAndYobSMTID,
  } = getOfacSMTs();
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
    document === 'passport' ? nameAndDobSMT : nameAndDobSMTID,
    document === 'passport' ? nameAndYobSMT : nameAndYobSMTID,
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

/*** DISCLOSURE ***/

function getOfacSMTs() {
  // TODO: get the SMT from an endpoint
  const passportNoAndNationalitySMT = new SMT(poseidon2, true);
  passportNoAndNationalitySMT.import(passportNoAndNationalitySMTData);
  const nameAndDobSMT = new SMT(poseidon2, true);
  nameAndDobSMT.import(nameAndDobSMTData);
  const nameAndYobSMT = new SMT(poseidon2, true);
  nameAndYobSMT.import(nameAndYobSMTData);
  const nameAndDobSMTID = new SMT(poseidon2, true);
  nameAndDobSMTID.import(nameAndDobSMTDataID);
  const nameAndYobSMTID = new SMT(poseidon2, true);
  nameAndYobSMTID.import(nameAndYobSMTDataID);
  return {
    passportNoAndNationalitySMT,
    nameAndDobSMT,
    nameAndYobSMT,
    nameAndDobSMTID,
    nameAndYobSMTID,
  };
}

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
