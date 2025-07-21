// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

// Import the polyfill first - this automatically provides global.crypto.getRandomValues()
import 'react-native-get-random-values';

// https://docs.ethers.org/v6/cookbook/react-native/
import { ethers } from 'ethers';

// ethers.js v6 will automatically use global.crypto.getRandomValues() for randomBytes
// No manual registration needed for most crypto functions as ethers has built-in implementations

export { ethers };
