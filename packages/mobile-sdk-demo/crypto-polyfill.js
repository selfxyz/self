// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

// Crypto polyfill using @noble/hashes for React Native compatibility
const { sha256 } = require('@noble/hashes/sha256');
const { sha1 } = require('@noble/hashes/sha1');
const { sha512 } = require('@noble/hashes/sha512');

// Create a crypto polyfill that provides the Node.js crypto API
const crypto = {
  createHash: algorithm => {
    const algorithms = {
      sha256: sha256,
      sha1: sha1,
      sha512: sha512,
    };

    const hashFunction = algorithms[algorithm.toLowerCase()];
    if (!hashFunction) {
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
    }

    let data = Buffer.alloc(0);

    return {
      update: inputData => {
        // Accumulate data
        data = Buffer.concat([data, Buffer.from(inputData)]);
        return this;
      },
      digest: encoding => {
        const hash = hashFunction(data);
        if (encoding === 'hex') {
          return Buffer.from(hash).toString('hex');
        }
        return Buffer.from(hash);
      },
    };
  },

  // Add other commonly used crypto methods as needed
  randomBytes: size => {
    // For React Native, we can use react-native-get-random-values
    const { getRandomValues } = require('react-native-get-random-values');
    const array = new Uint8Array(size);
    getRandomValues(array);
    return Buffer.from(array);
  },
};

module.exports = crypto;
