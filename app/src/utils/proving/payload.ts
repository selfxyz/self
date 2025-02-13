import { LeanIMT } from '@openpassport/zk-kit-lean-imt';
import { SMT } from '@openpassport/zk-kit-smt';
import { poseidon2 } from 'poseidon-lite';
import { v4 } from 'uuid';

import nameAndDobSMTData from '../../../../common/ofacdata/outputs/nameAndDobSMT.json';
import nameAndYobSMTData from '../../../../common/ofacdata/outputs/nameAndYobSMT.json';
import passportNoAndNationalitySMTData from '../../../../common/ofacdata/outputs/passportNoAndNationalitySMT.json';
import {
  DEPLOYED_CIRCUITS_DSC,
  DEPLOYED_CIRCUITS_REGISTER,
  PASSPORT_ATTESTATION_ID,
  WS_RPC_URL_DSC,
  WS_RPC_URL_REGISTER,
  WS_RPC_URL_VC_AND_DISCLOSE,
} from '../../../../common/src/constants/constants';
import { getCircuitNameFromPassportData } from '../../../../common/src/utils/circuits/circuitsName';
import {
  generateCircuitInputsDSC,
  generateCircuitInputsRegister,
  generateCircuitInputsVCandDisclose,
} from '../../../../common/src/utils/circuits/generateInputs';
import { generateCommitment } from '../../../../common/src/utils/passports/passport';
import { getDSCTree, getLeafDscTree } from '../../../../common/src/utils/trees';
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
    console.log('Passport data is not parsed');
    return false;
  }
  const passportMetadata = passportData.passportMetadata;
  if (!passportMetadata) {
    console.log('Passport metadata is null');
    return false;
  }
  if (!passportMetadata.cscaFound) {
    console.log('CSCA not found');
    return false;
  }
  const circuitNameRegister = getCircuitNameFromPassportData(
    passportData,
    'register',
  );
  if (
    !circuitNameRegister ||
    !DEPLOYED_CIRCUITS_REGISTER.includes(circuitNameRegister)
  ) {
    console.log('Circuit not supported:', circuitNameRegister);
    return false;
  }
  const circuitNameDsc = getCircuitNameFromPassportData(passportData, 'dsc');
  if (!circuitNameDsc || !DEPLOYED_CIRCUITS_DSC.includes(circuitNameDsc)) {
    console.log('DSC circuit not supported:', circuitNameDsc);
    return false;
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
    console.log('Passport not supported');
    return;
  }
  const { inputs, circuitName } = await generateTeeInputsRegister(
    mock_secret,
    passportData,
  );
  await sendPayload(inputs, circuitName, WS_RPC_URL_REGISTER);
}

function generateTeeInputsDsc(passportData: PassportData) {
  const inputs = generateCircuitInputsDSC(passportData.dsc, false);
  const circuitName = getCircuitNameFromPassportData(passportData, 'dsc');
  if (circuitName == null) {
    throw new Error('Circuit name is null');
  }
  return { inputs, circuitName };
}

export async function sendDscPayload(passportData: PassportData): Promise<any> {
  if (!passportData) {
    return false;
  }
  const isSupported = checkPassportSupported(passportData);
  if (!isSupported) {
    console.log('Passport not supported'); //TODO: show a screen explaining that the passport is not supported.
    return false;
  }
  const { inputs, circuitName } = generateTeeInputsDsc(passportData);
  console.log('circuitName', circuitName);
  const result = await sendPayload(inputs, circuitName, WS_RPC_URL_DSC);
  return result;
}

function generateTeeInputsVCAndDisclose(passportData: PassportData) {
  const majority = '18';
  // THIS Does not work. need a package for this in react native
  const user_identifier = v4();
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
  const passportNoAndNationalitySMT = new SMT(poseidon2, true);
  passportNoAndNationalitySMT.import(passportNoAndNationalitySMTData);
  const nameAndDobSMT = new SMT(poseidon2, true);
  nameAndDobSMT.import(nameAndDobSMTData);
  const nameAndYobSMT = new SMT(poseidon2, true);
  nameAndYobSMT.import(nameAndYobSMTData);

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
    passportNoAndNationalitySMT,
    nameAndDobSMT,
    nameAndYobSMT,
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
  await sendPayload(inputs, circuitName, WS_RPC_URL_VC_AND_DISCLOSE);
}

/*** Logic Flow ****/

function isUserRegistered(_passportData: PassportData) {
  // check if user is already registered
  // if registered, return true
  // if not registered, return false
  return false;
}

async function checkIdPassportDscIsInTree(passportData: PassportData) {
  // download the dsc tree and check if the passport leaf is in the tree
  const dscTree = await getDSCTree(false);
  const hashFunction = (a: any, b: any) => poseidon2([a, b]);
  const tree = LeanIMT.import(hashFunction, dscTree);
  const leaf = getLeafDscTree(
    passportData.dsc_parsed,
    passportData.csca_parsed,
  );
  console.log('DSC leaf:', leaf);
  const index = tree.indexOf(BigInt(leaf));
  if (index === -1) {
    console.log('DSC is not found in the tree, sending DSC payload');
    await sendDscPayload(passportData);
  } else {
    console.log('DSC is found in the tree, skipping DSC payload');
  }
}

export async function registerPassport(passportData: PassportData) {
  // check if user is already registered
  const isRegistered = isUserRegistered(passportData);
  if (isRegistered) {
    return; // TODO: show a screen explaining that the passport is already registered, needs to bring passphrase or secret from icloud backup
  }
  // download the dsc tree and check if the passport leaf is in the tree
  await checkIdPassportDscIsInTree(passportData);
  // send the register payload
  await sendRegisterPayload(passportData);
}
