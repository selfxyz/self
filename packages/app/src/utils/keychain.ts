import * as Keychain from 'react-native-keychain';

import { PassportData } from '@openpassport/common/utils/types';
import { ethers } from 'ethers';

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
