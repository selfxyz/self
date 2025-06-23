//  SPDX-License-Identifier: BUSL-1.1
//  Copyright (c) 2025 Social Connect Labs, Inc.
//
//  This file is licensed under the Business Source License 1.1 (BUSL-1.1).
//
//  Use of this software is governed by the Business Source License included in the LICENSE file.
//
//  As of 2029-06-11, this file will be governed by the Apache License, Version 2.0.

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
