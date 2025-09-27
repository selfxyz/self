// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/**
 * Thin wrapper that re-exports the shared crypto polyfill from @selfxyz/common
 * This ensures Metro can resolve crypto imports while using the consolidated implementation
 */

// Re-export the shared crypto polyfill implementation
const { cryptoPolyfill } = require('@selfxyz/common');

module.exports = cryptoPolyfill;
