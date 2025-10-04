// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Thin wrapper that re-exports the shared crypto polyfill from @selfxyz/common
 * This ensures Metro can resolve crypto imports while using the consolidated implementation
 */

// Re-export the shared crypto polyfill implementation
const { cryptoPolyfill, createHash, createHmac, randomBytes, pbkdf2Sync } = require('@selfxyz/common');

// Fallback to Node.js crypto implementation when the shared polyfill isn't available
const nodeCrypto = require('crypto');

const exportedPolyfill = cryptoPolyfill ?? {
  createHash: createHash ?? nodeCrypto.createHash.bind(nodeCrypto),
  createHmac: createHmac ?? nodeCrypto.createHmac.bind(nodeCrypto),
  randomBytes:
    randomBytes ??
    (size => {
      if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
        throw new Error('globalThis.crypto.getRandomValues is not available');
      }
      const out = new Uint8Array(size);
      globalThis.crypto.getRandomValues(out);
      return Buffer.from(out);
    }),
  pbkdf2Sync: pbkdf2Sync ?? nodeCrypto.pbkdf2Sync.bind(nodeCrypto),
};

module.exports = exportedPolyfill;
module.exports.default = exportedPolyfill;
