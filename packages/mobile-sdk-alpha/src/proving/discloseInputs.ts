import { poseidon2 } from 'poseidon-lite';

import {
  attributeToPosition,
  attributeToPosition_ID,
  DEFAULT_MAJORITY,
  ID_CARD_ATTESTATION_ID,
  PASSPORT_ATTESTATION_ID,
} from '@selfxyz/common/constants';
import type { DocumentCategory, PassportData } from '@selfxyz/common/types';
import type { SelfAppDisclosureConfig } from '@selfxyz/common/utils';
import {
  calculateUserIdentifierHash,
  generateCircuitInputsVCandDisclose,
  hashEndpointWithScope,
} from '@selfxyz/common/utils';

import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';

/**
 * Minimal configuration of a Self app requesting disclosures.
 */
export interface DiscloseSelfApp {
  scope: string;
  disclosures: SelfAppDisclosureConfig;
  userId: string;
  userDefinedData: string;
  chainID: number;
}

/**
 * Serialized OFAC screening trees.
 */
export interface OfacTrees {
  passportNoAndNationality?: string | null;
  nameAndDob: string;
  nameAndYob: string;
}

/**
 * Generate circuit inputs and endpoint metadata for a disclosure proof.
 *
 * @param secret - User's secret used for witness generation.
 * @param passportData - Parsed passport or ID card data.
 * @param selfApp - Application requesting selective disclosures.
 * @param ofacTrees - Trees for OFAC screening checks.
 * @param commitmentTree - Commitment Merkle tree.
 * @param env - Target environment, production or staging.
 */
export function discloseInputs(
  secret: string,
  passportData: PassportData,
  selfApp: DiscloseSelfApp,
  ofacTrees: OfacTrees,
  commitmentTree: string,
  env: 'prod' | 'stg',
) {
  const { scope, disclosures, userId, userDefinedData, chainID } = selfApp;
  const userIdentifierHash = calculateUserIdentifierHash(chainID, userId, userDefinedData);
  const endpoint = 'https://self.xyz';
  const scope_hash = hashEndpointWithScope(endpoint, scope);
  const document: DocumentCategory = passportData.documentCategory;

  const selector_dg1 = getSelectorDg1(document, disclosures);

  const majority = disclosures.minimumAge ? disclosures.minimumAge.toString() : DEFAULT_MAJORITY;
  const selector_older_than = disclosures.minimumAge ? '1' : '0';

  const selector_ofac = disclosures.ofac ? 1 : 0;

  let passportNoAndNationalitySMT: SMT | null = null;
  const nameAndDobSMT = new SMT(poseidon2, true);
  const nameAndYobSMT = new SMT(poseidon2, true);
  if (document === 'passport') {
    passportNoAndNationalitySMT = new SMT(poseidon2, true);
    if (ofacTrees.passportNoAndNationality) {
      passportNoAndNationalitySMT.import(ofacTrees.passportNoAndNationality);
    }
  }
  nameAndDobSMT.import(ofacTrees.nameAndDob);
  nameAndYobSMT.import(ofacTrees.nameAndYob);

  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), commitmentTree);
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
  const circuitName = passportData.documentCategory === 'passport' ? 'vc_and_disclose' : 'vc_and_disclose_id';
  const endpointType = env === 'stg' ? 'staging_celo' : 'celo';
  return { inputs, circuitName, endpointType, endpoint };
}

/**
 * Build the DG1 selector based on document type and requested disclosures.
 */
function getSelectorDg1(document: DocumentCategory, disclosures: SelfAppDisclosureConfig) {
  switch (document) {
    case 'passport':
      return getSelectorDg1Passport(disclosures);
    case 'id_card':
      return getSelectorDg1IdCard(disclosures);
    default:
      throw new Error(`Unsupported document category: ${document as string}`);
  }
}

/**
 * Selector builder for passport DG1 attributes.
 */
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

/**
 * Selector builder for ID card DG1 attributes.
 */
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
