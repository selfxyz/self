// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay

import platform.Foundation.NSUserDefaults

actual object AppStorage {
    private val defaults = NSUserDefaults.standardUserDefaults

    actual fun load(key: String): String? = defaults.stringForKey(key)

    actual fun save(key: String, value: String) {
        defaults.setObject(value, forKey = key)
    }

    actual fun clear(key: String) {
        defaults.removeObjectForKey(key)
    }
}
