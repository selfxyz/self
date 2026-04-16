// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

object SdkProviderRegistry {
    var secureStorage: SecureStorageProvider? = null
    internal var crypto: CryptoProvider? = null

    /**
     * Returns true if the required providers are configured.
     * Only secureStorage is required — crypto is internal and lifecycle is handler-only.
     */
    fun isConfigured(): Boolean = secureStorage != null

    fun reset() {
        secureStorage = null
        crypto = null
    }
}
