// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AndroidWebViewHostSecurityTest {
    @Test
    fun `release builds launch remote content`() {
        assertEquals(
            "https://self-app-alpha.vercel.app/tunnel/tour/1",
            AndroidWebViewHost.initialContentUrl(queryParams = "", isDebugMode = false),
        )
    }

    @Test
    fun `debug builds launch localhost`() {
        assertTrue(
            AndroidWebViewHost
                .initialContentUrl(queryParams = "", isDebugMode = true)
                .startsWith("http://127.0.0.1:5173"),
        )
    }

    @Test
    fun `navigation allows remote didit and debug origins`() {
        val remoteBase = "https://self-app-alpha.vercel.app"
        assertTrue(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://self-app-alpha.vercel.app/tunnel/tour/1",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteBase,
            ),
        )
        assertTrue(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://verify.didit.me/session/123",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteBase,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://evil.example.com/tunnel/tour/1",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteBase,
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
        val remoteBase = "https://self-app-alpha.vercel.app"
        assertFalse(
            AndroidWebViewHost.isAllowedNavigationUrl(
                "https://verify.didit.me:8443/session/123",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteBase,
            ),
        )
    }

    @Test
    fun `bridge trust accepts remote rejects didit and arbitrary origins`() {
        val remoteBase = "https://self-app-alpha.vercel.app"
        assertTrue(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://self-app-alpha.vercel.app/tunnel/tour/1",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteBase,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://verify.didit.me/session/123",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteBase,
            ),
        )
        assertFalse(
            AndroidWebViewHost.isTrustedBridgeOrigin(
                "https://evil.example.com/tunnel/tour/1",
                isDebugMode = false,
                remoteWebAppBaseUrl = remoteBase,
            ),
        )
    }
}
