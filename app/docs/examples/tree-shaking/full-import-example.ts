// SPDX-License-Identifier: BUSL-1.1; Copyright (c) 2025 Social Connect Labs, Inc.; Licensed under BUSL-1.1 (see LICENSE); Apache-2.0 from 2029-06-11

import * as common from '@selfxyz/common';

// Example usage - only using a small subset
// eslint-disable-next-line no-console
console.log('API URL:', common.API_URL);
// eslint-disable-next-line no-console
console.log('Hash function exists:', typeof common.hash === 'function');

// Even though we only use 2 things, the bundler includes everything from @selfxyz/common
// This can add significant bundle size

export function exampleFullImport() {
  return {
    apiUrl: common.API_URL,
    hashTest: 'mock-hash', // hash needs hashFunction, bytesArray, format parameters
  };
}
