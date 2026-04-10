// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import java.net.URI

internal actual fun parseUrl(raw: String): UrlComponents? =
    runCatching {
        val uri = URI(raw)
        UrlComponents(
            scheme = uri.scheme,
            host = uri.host ?: uri.authority,
            port = if (uri.port != -1) uri.port else 0,
            path = uri.path,
        )
    }.getOrNull()
