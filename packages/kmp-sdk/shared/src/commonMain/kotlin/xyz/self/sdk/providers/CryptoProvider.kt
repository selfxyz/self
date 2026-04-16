// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

internal interface CryptoProvider {
    fun generateKey(keyRef: String)

    fun getPublicKey(keyRef: String): String?

    fun sign(
        keyRef: String,
        data: String,
    ): String?

    fun deleteKey(keyRef: String)
}
