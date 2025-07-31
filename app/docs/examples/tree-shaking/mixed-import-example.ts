// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import {
  API_URL,
  buildSMT,
  countryCodes,
  generateCommitment,
  hash,
} from '@selfxyz/common';

// Example usage
// eslint-disable-next-line no-console
console.log('API URL:', API_URL);
// eslint-disable-next-line no-console
console.log('Hash function exists:', typeof hash === 'function');
// eslint-disable-next-line no-console
console.log('Countries available:', Object.keys(countryCodes).length);

export function exampleMixedImport() {
  return {
    apiUrl: API_URL,
    hashTest: 'mock-hash', // hash needs hashFunction, bytesArray, format parameters
    countryCount: Object.keys(countryCodes).length,
    // We imported buildSMT and generateCommitment but don't use them
    // They might still get bundled depending on the bundler's sophistication
  };
}
