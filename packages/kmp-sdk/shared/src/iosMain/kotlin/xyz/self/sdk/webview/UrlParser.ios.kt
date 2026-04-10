// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import platform.Foundation.NSURL
import platform.Foundation.NSURLComponents

internal actual fun parseUrl(raw: String): UrlComponents? =
    runCatching {
        val nsUrl = NSURL(string = raw) ?: return null
        val components = NSURLComponents(uRL = nsUrl, resolvingAgainstBaseURL = false) ?: return null
        UrlComponents(
            scheme = components.scheme,
            host = components.host,
            port = components.port?.intValue ?: 0,
            path = components.path,
        )
    }.getOrNull()
