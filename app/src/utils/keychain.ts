import * as Keychain from 'react-native-keychain';

import { ethers } from 'ethers';

import { PassportMetadata } from '../../../common/src/utils/passports/passport_parsing/parsePassportData';
import { PassportData } from '../../../common/src/utils/types';

export async function restoreSecret(mnemonic: string) {
  console.warn(
    'DEPRECATED: `restoreSecret` should not be used anymore, use `TODO().restore`',
  );
  const restoredWallet = ethers.Wallet.fromPhrase(mnemonic);
  return restoreFromPrivateKey(restoredWallet.privateKey);
}

export async function restoreFromPrivateKey(privateKey: string) {
  console.warn(
    'DEPRECATED: `restoreFromPrivateKey` should not be used anymore, use `TODO().restoreFromPrivateKey`',
  );
  await Keychain.setGenericPassword('secret', privateKey, {
    service: 'secret',
  });
}

export async function loadSecretOrCreateIt() {
  console.warn(
    'DEPRECATED: `loadSecretOrCreateIt` should not be used anymore, use `TODO().loadSecretOrCreateIt`',
  );
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
  console.warn(
    'DEPRECATED: `loadSecret` should not be used anymore, use `TODO().loadSecret`',
  );
  const secretCreds = await Keychain.getGenericPassword({ service: 'secret' });
  return secretCreds === false ? false : secretCreds.password;
}

export async function loadPassportData() {
  console.warn(
    '`loadPassportData` should not be used anymore, use `usePassport().getData`',
  );
  const passportDataCreds = await Keychain.getGenericPassword({
    service: 'passportData',
  });
  return passportDataCreds === false ? false : passportDataCreds.password;
}

export async function storePassportData(passportData: PassportData) {
  console.warn(
    'DEPRECATED: `storePassportData` should not be used anymore, use `usePassport().setData`',
  );
  await Keychain.setGenericPassword(
    'passportData',
    JSON.stringify(passportData),
    { service: 'passportData' },
  );
}

export async function loadPassportMetadata() {
  console.warn(
    'DEPRECATED: `loadPassportMetadata` should not be used anymore, use `usePassport().getMetadata`',
  );
  const metadataCreds = await Keychain.getGenericPassword({
    service: 'passportMetadata',
  });
  return metadataCreds === false ? false : metadataCreds.password;
}

export async function storePassportMetadata(metadata: PassportMetadata) {
  console.warn(
    'DEPRECATED: `storePassportMetadata` should not be used anymore, use `usePassport().setMetadata`',
  );
  await Keychain.setGenericPassword(
    'passportMetadata',
    JSON.stringify(metadata),
    { service: 'passportMetadata' },
  );
}
