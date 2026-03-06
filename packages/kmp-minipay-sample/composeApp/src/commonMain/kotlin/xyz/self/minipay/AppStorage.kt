// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay

/**
 * Platform-specific key-value storage.
 * On Android, backed by SharedPreferences (requires [init] with Context).
 * On iOS, backed by NSUserDefaults.
 */
expect object AppStorage {
    fun load(key: String): String?
    fun save(key: String, value: String)
    fun clear(key: String)
}
