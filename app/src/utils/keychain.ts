import * as Keychain from 'react-native-keychain';

import { ethers } from 'ethers';

import { PassportMetadata } from '../../../common/src/utils/passports/passport_parsing/parsePassportData';
import { PassportData } from '../../../common/src/utils/types';

export async function loadSecretOrCreateIt() {
  const secret = await loadSecret();
  if (secret) {
    return secret;
  }

  console.log('No secret found, creating one');
  const randomWallet = ethers.Wallet.createRandom();
  const newSecret = randomWallet.privateKey;
  await Keychain.setGenericPassword('secret', newSecret, { service: 'secret' });
  return newSecret;
}

export async function loadSecret() {
  const secretCreds = await Keychain.getGenericPassword({ service: 'secret' });
  return secretCreds === false ? false : secretCreds.password;
}

export async function loadPassportData() {
  const passportDataCreds = await Keychain.getGenericPassword({
    service: 'passportData',
  });
  return passportDataCreds === false ? false : passportDataCreds.password;
}

export async function storePassportData(passportData: PassportData) {
  await Keychain.setGenericPassword(
    'passportData',
    JSON.stringify(passportData),
    { service: 'passportData' },
  );
}

export async function loadPassportMetadata() {
  const metadataCreds = await Keychain.getGenericPassword({
    service: 'passportMetadata',
  });
  return metadataCreds === false ? false : metadataCreds.password;
}

export async function storePassportMetadata(metadata: PassportMetadata) {
  await Keychain.setGenericPassword(
    'passportMetadata',
    JSON.stringify(metadata),
    { service: 'passportMetadata' },
  );
}
