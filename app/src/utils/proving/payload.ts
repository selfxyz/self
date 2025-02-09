import { getCircuitNameFromPassportData } from '../../../../common/src/utils/circuits/circuitsName';
import { generateCircuitInputsRegister } from '../../../../common/src/utils/circuits/generateInputs';
import { PassportData } from '../../../../common/src/utils/types';
import { sendPayload } from './tee';

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
    '0', //TODO: retrieve the secret from keychain
    passportData,
  );
  await sendPayload(inputs, circuitName);
}
