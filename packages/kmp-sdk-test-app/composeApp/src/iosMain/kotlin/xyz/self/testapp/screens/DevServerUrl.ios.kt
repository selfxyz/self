// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.screens

import platform.Foundation.NSBundle

actual fun getDevServerUrl(): String? {
    val value = NSBundle.mainBundle.objectForInfoDictionaryKey("WEBVIEW_DEV_URL") as? String
    if (value.isNullOrBlank() || value.startsWith("$(")) return null
    return value
}
