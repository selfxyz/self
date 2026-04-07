// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidWebViewHostSecurityTest {
    private val remoteUrl = "https://self-app-alpha.vercel.app"

    @Test
    fun `release builds launch remote content`() {
        assertEquals(
            "https://self-app-alpha.vercel.app/tunnel/tour/1",
            AndroidWebViewHost.initialContentUrl(queryParams = "", isDebugMode = false, remoteWebAppBaseUrl = remoteUrl),
        )
    }

    @Test
    fun `debug builds launch localhost content`() {
        assertEquals(
            "http://127.0.0.1:5173/tunnel/tour/1",
            AndroidWebViewHost.initialContentUrl(queryParams = "", isDebugMode = true, remoteWebAppBaseUrl = remoteUrl),
        )
    }

    @Test
    fun `navigation allows remote origin and didit`() {
        assertTrue(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://self-app-alpha.vercel.app/tunnel/tour/1",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
        assertTrue(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://verify.didit.me/session/123",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
        assertTrue(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "http://127.0.0.1:5173/tunnel/tour/1",
                isDebugMode = true,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun `navigation rejects arbitrary origins`() {
        assertFalse(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://evil.com/tunnel/tour/1",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "http://example.com/test",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun `release build rejects HTTP base URL`() {
        assertFailsWith<IllegalArgumentException> {
            AndroidWebViewHost.initialContentUrl(
                queryParams = "",
                isDebugMode = false,
                remoteWebAppBaseUrl = "http://self-app-alpha.vercel.app",
            )
        }
    }

    @Test
    fun `didit on non-443 port is rejected`() {
        assertFalse(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://verify.didit.me:8443/session/123",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun `bridge trust is limited to remote origin in release`() {
        assertTrue(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://self-app-alpha.vercel.app/tunnel/tour/1",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://verify.didit.me/session/123",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://evil.com/tunnel/tour/1",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }
}
