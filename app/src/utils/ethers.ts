// https://docs.ethers.org/v6/cookbook/react-native/
import crypto from 'react-native-quick-crypto';

import { ethers } from 'ethers';

ethers.randomBytes.register(length => {
  return new Uint8Array(crypto.randomBytes(length));
});

ethers.computeHmac.register((algo, key, data) => {
  return crypto.createHmac(algo, key).update(data).digest();
});

// @ts-expect-error
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
