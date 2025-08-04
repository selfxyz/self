// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// https://docs.ethers.org/v6/cookbook/react-native/
import { ethers } from 'ethers';
import {
  computeHmac,
  pbkdf2,
  randomBytes,
  sha256,
  sha512,
} from './crypto';

ethers.randomBytes.register(randomBytes);

ethers.computeHmac.register(computeHmac);

ethers.pbkdf2.register(pbkdf2);

ethers.sha256.register(sha256);

ethers.sha512.register(sha512);
