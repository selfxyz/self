// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidWebViewHostSecurityTest {
    @Test
    fun `release builds launch bundled content`() {
        assertEquals(
            "https://appassets.androidplatform.net/tunnel/tour/1",
            AndroidWebViewHost.initialContentUrl(queryParams = "", isDebugMode = false),
        )
    }

    @Test
    fun `navigation only allows bundled didit and debug origins`() {
        assertTrue(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://appassets.androidplatform.net/tunnel/tour/1",
                isDebugMode = false,
            ),
        )
        assertTrue(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://verify.didit.me/session/123",
                isDebugMode = false,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://self-app-alpha.vercel.app/tunnel/tour/1",
                isDebugMode = false,
            ),
        )
        assertTrue(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "http://127.0.0.1:5173/tunnel/tour/1",
                isDebugMode = true,
            ),
        )
    }

    @Test
    fun `bridge trust is limited to bundled origin in release`() {
        assertTrue(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://appassets.androidplatform.net/tunnel/tour/1",
                isDebugMode = false,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://verify.didit.me/session/123",
                isDebugMode = false,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://self-app-alpha.vercel.app/tunnel/tour/1",
                isDebugMode = false,
            ),
        )
    }
}
