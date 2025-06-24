// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// https://docs.ethers.org/v6/cookbook/react-native/
import { ethers } from 'ethers';
import crypto from 'react-native-quick-crypto';

ethers.randomBytes.register(length => {
  return new Uint8Array(crypto.randomBytes(length));
});

ethers.computeHmac.register((algo, key, data) => {
  return crypto.createHmac(algo, key).update(data).digest();
});

ethers.pbkdf2.register((passwd, salt, iter, keylen, algo) => {
  return crypto.pbkdf2Sync(passwd, salt, iter, keylen, algo);
});

ethers.sha256.register(data => {
  // @ts-expect-error
  return crypto.createHash('sha256').update(data).digest();
});

ethers.sha512.register(data => {
  // @ts-expect-error
  return crypto.createHash('sha512').update(data).digest();
});
