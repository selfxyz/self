// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

object SdkProviderRegistry {
    var secureStorage: SecureStorageProvider? = null
    var crypto: CryptoProvider? = null

    /**
     * Returns true if the required 3-domain providers are configured.
     * Only secureStorage and crypto are required — lifecycle is handler-only
     * with no consumer-provided provider.
     */
    fun isConfigured(): Boolean = secureStorage != null && crypto != null

    fun reset() {
        secureStorage = null
        crypto = null
    }
}
