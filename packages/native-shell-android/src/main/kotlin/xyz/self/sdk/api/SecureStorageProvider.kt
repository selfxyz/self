// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

interface SecureStorageProvider {
    @Throws(Exception::class)
    fun get(key: String): String?

    fun set(key: String, value: String)
    fun remove(key: String)
}
