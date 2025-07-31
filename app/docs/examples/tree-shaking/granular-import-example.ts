// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import { API_URL, countryCodes } from '@selfxyz/common/constants';
import { hash } from '@selfxyz/common/utils';

// Example usage - same functionality as mixed-import but better tree shaking
// eslint-disable-next-line no-console
console.log('API URL:', API_URL);
// eslint-disable-next-line no-console
console.log('Hash function exists:', typeof hash === 'function');
// eslint-disable-next-line no-console
console.log('Countries available:', Object.keys(countryCodes).length);

export function exampleGranularImport() {
  return {
    apiUrl: API_URL,
    hashTest: 'mock-hash', // hash needs hashFunction, bytesArray, format parameters
    countryCount: Object.keys(countryCodes).length,
  };
}

// Benefits:
// 1. Only imports exactly what's needed
// 2. Bundler can easily eliminate unused code
// 3. Smaller bundle sizes
// 4. Faster build times
// 5. Better development experience with clearer dependencies
