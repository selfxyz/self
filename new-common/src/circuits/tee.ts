import { poseidon2 } from 'poseidon-lite';
import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';

import type { DocumentCategory, IDDocument, PassportData } from '../foundation/types/document.js';
import type { Environment, OfacTree } from '../foundation/types/environment.js';
import type { EndpointType, SelfApp, SelfAppDisclosureConfig } from '../foundation/types/app.js';
import { DEFAULT_MAJORITY } from '../foundation/constants/circuit.js';
import { calculateUserIdentifierHash } from '../crypto/identity.js';
import { hashEndpointWithScope } from '../crypto/scope.js';
import { createDocument } from '../documents/factory.js';
import { createCircuitInputGenerator } from './generator.js';
import type { DisclosureField } from '../documents/interface.js';

interface TEEResult {
  inputs: any;
  circuitName: string;
  endpointType: EndpointType | string;
  endpoint: string;
}

type TreeGetter = <T extends 'ofac' | 'commitment'>(
  doc: DocumentCategory,
  tree: T,
) => T extends 'ofac' ? OfacTree : any;

function envToEndpointType(env: Environment): string {
  return env === 'stg' ? 'staging_celo' : 'celo';
}

function disclosureConfigToFields(disclosures: SelfAppDisclosureConfig): DisclosureField[] {
  const mapping: [keyof SelfAppDisclosureConfig, DisclosureField][] = [
    ['name', 'name'],
    ['gender', 'gender'],
    ['date_of_birth', 'date_of_birth'],
    ['nationality', 'nationality'],
    ['passport_number', 'id_number'],
    ['issuing_state', 'issuing_state'],
    ['expiry_date', 'expiry_date'],
    ['ofac', 'ofac'],
    ['minimumAge', 'older_than'],
  ];
  return mapping.filter(([key]) => disclosures[key]).map(([_, field]) => field);
}

function buildOfacTrees(ofac_trees: OfacTree, document: DocumentCategory) {
  if (!ofac_trees.nameAndDob || !ofac_trees.nameAndYob) {
    throw new Error('Invalid OFAC tree structure: missing required fields');
  }
  if (document === 'passport' && !ofac_trees.passportNoAndNationality) {
    throw new Error('Invalid OFAC tree structure: missing passportNoAndNationality for passport');
  }

  const nameAndDobSMT = new SMT(poseidon2, true);
  const nameAndYobSMT = new SMT(poseidon2, true);
  nameAndDobSMT.import(ofac_trees.nameAndDob);
  nameAndYobSMT.import(ofac_trees.nameAndYob);

  let passportNoAndNationalitySMT: SMT | null = null;
  if (document === 'passport') {
    passportNoAndNationalitySMT = new SMT(poseidon2, true);
    passportNoAndNationalitySMT.import(ofac_trees.passportNoAndNationality);
  }

  return { nameAndDobSMT, nameAndYobSMT, passportNoAndNationalitySMT };
}

const generator = createCircuitInputGenerator();

export async function generateTEEInputsRegister(
  secret: string,
  passportData: IDDocument,
  dscTree: string | string[],
  env: Environment,
): Promise<TEEResult> {
  const doc = createDocument(passportData);
  const inputs = generator.generateRegisterInputs(doc, secret, dscTree as string);
  return {
    inputs,
    circuitName: doc.getRegisterCircuitName(),
    endpointType: envToEndpointType(env),
    endpoint: 'https://self.xyz',
  };
}

export function generateTEEInputsDSC(
  passportData: PassportData,
  cscaTree: string[][],
  env: Environment,
): TEEResult {
  const doc = createDocument(passportData);
  const inputs = generator.generateDscInputs(doc, cscaTree);
  return {
    inputs,
    circuitName: doc.getDscCircuitName(),
    endpointType: envToEndpointType(env),
    endpoint: 'https://self.xyz',
  };
}

export function generateTEEInputsDiscloseStateless(
  secret: string,
  passportData: IDDocument,
  selfApp: SelfApp,
  getTree: TreeGetter,
): TEEResult {
  const { scope, disclosures, endpoint, userId, userDefinedData, chainID } = selfApp;
  const userIdentifierHash = calculateUserIdentifierHash(chainID, userId, userDefinedData);
  const scope_hash = hashEndpointWithScope(endpoint, scope);
  const document: DocumentCategory = passportData.documentCategory;
  const doc = createDocument(passportData);

  const ofac_trees = getTree(document, 'ofac');
  if (!ofac_trees) throw new Error('OFAC trees not loaded');

  const { nameAndDobSMT, nameAndYobSMT, passportNoAndNationalitySMT } =
    buildOfacTrees(ofac_trees, document);

  const serialized_tree = getTree(document, 'commitment');
  const tree = LeanIMT.import((a, b) => poseidon2([a, b]), serialized_tree);

  const inputs = generator.generateDiscloseInputs(doc, secret, {
    scope: scope_hash,
    fieldsToReveal: disclosureConfigToFields(disclosures),
    merkletree: tree,
    majority: disclosures.minimumAge ? disclosures.minimumAge.toString() : DEFAULT_MAJORITY,
    minimumAge: disclosures.minimumAge ?? 0,
    passportNo_smt: passportNoAndNationalitySMT,
    nameAndDob_smt: nameAndDobSMT,
    nameAndYob_smt: nameAndYobSMT,
    forbidden_countries_list: disclosures.excludedCountries ?? [],
    user_identifier: userIdentifierHash.toString(),
  });

  return {
    inputs,
    circuitName: doc.getDiscloseCircuitName(),
    endpointType: selfApp.endpointType,
    endpoint: selfApp.endpoint,
  };
}
