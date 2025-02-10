import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { poseidon2 } from 'poseidon-lite';

import namejson from '../../../../common/ofacdata/outputs/nameSMT.json';
import { PASSPORT_ATTESTATION_ID } from '../../../../common/src/constants/constants';
import { getCircuitNameFromPassportData } from '../../../../common/src/utils/circuits/circuitsName';
import {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from '../../../../common/src/utils/circuits/generateInputs';
import { generateCommitment } from '../../../../common/src/utils/passports/passport';
import { PassportData } from '../../../../common/src/utils/types';
import { sendPayload } from './tee';

const mock_secret = '0'; //TODO: retrieve the secret from keychain

function generateTeeInputsRegister(secret: string, passportData: PassportData) {
  const inputs = generateCircuitInputsRegister(secret, passportData);
  const circuitName = getCircuitNameFromPassportData(passportData, 'register');
  if (circuitName == null) {
    throw new Error('Circuit name is null');
  }
  return { inputs, circuitName };
}

function checkPassportSupported(passportData: PassportData) {
  if (!passportData.parsed) {
    throw new Error('Passport data is not parsed');
  }
  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata) {
    throw new Error('Passport is null');
  }
  if (!passportMetadata.cscaFound) {
    throw new Error('CSCA not found');
  }
  const circuitName = getCircuitNameFromPassportData(passportData, 'register');
  if (circuitName == null) {
    throw new Error('Circuit name is null');
    // TODO, check if the circuit is deployed
  }
  return true;
}

export async function sendRegisterPayload(passportData: PassportData) {
  if (!passportData) {
    return null;
  }
  const isSupported = checkPassportSupported(passportData);
  if (!isSupported) {
    // TODO: show a screen explaining that the passport is not supported.
    return;
  }
  const { inputs, circuitName } = generateTeeInputsRegister(
    mock_secret,
    passportData,
  );
  await sendPayload(inputs, circuitName);
}

function generateTeeInputsDsc(passportData: PassportData) {
  const inputs = generateCircuitInputsDSC(passportData.dsc);
  const circuitName = getCircuitNameFromPassportData(passportData, 'dsc');
  if (circuitName == null) {
    throw new Error('Circuit name is null');
  }
  return { inputs, circuitName };
}

export async function sendDscPayload(passportData: PassportData) {
  if (!passportData) {
    return null;
  }
  const isSupported = checkPassportSupported(passportData);
  if (!isSupported) {
    // TODO: show a screen explaining that the passport is not supported.
    return;
  }
  const { inputs, circuitName } = generateTeeInputsDsc(passportData);
  console.log('circuitName', circuitName);
  await sendPayload(inputs, circuitName);
}

function generateTeeInputsVCAndDisclose(passportData: PassportData) {
  const majority = '18';
  const user_identifier = crypto.randomUUID();
  const selector_dg1 = Array(88).fill('1');
  const selector_older_than = '1';
  const scope = '@coboyApp';
  const attestation_id = PASSPORT_ATTESTATION_ID;

  const commitment = generateCommitment(
    mock_secret,
    attestation_id,
    passportData,
  );
  const tree = new LeanIMT<bigint>((a, b) => poseidon2([a, b]), []);
  tree.insert(BigInt(commitment));
  let smt = new SMT(poseidon2, true);
  smt.import(namejson);

  const selector_ofac = 1;
  const forbidden_countries_list = ['ABC', 'DEF'];

  const inputs = generateCircuitInputsVCandDisclose(
    mock_secret,
    PASSPORT_ATTESTATION_ID,
    passportData,
    scope,
    selector_dg1,
    selector_older_than,
    tree,
    majority,
    smt,
    selector_ofac,
    forbidden_countries_list,
    user_identifier,
  );
  return { inputs, circuitName: 'vc_and_disclose' };
}

export async function sendVcAndDisclosePayload(
  passportData: PassportData | null,
) {
  if (!passportData) {
    return null;
  }
  const isSupported = checkPassportSupported(passportData);
  if (!isSupported) {
    // TODO: show a screen explaining that the passport is not supported.
    return;
  }
  const { inputs, circuitName } = generateTeeInputsVCAndDisclose(passportData);
  await sendPayload(inputs, circuitName);
}
