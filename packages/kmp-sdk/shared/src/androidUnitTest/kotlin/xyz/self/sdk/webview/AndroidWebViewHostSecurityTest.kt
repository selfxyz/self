// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AndroidWebViewHostSecurityTest {
    private val remoteUrl = "https://self-app-alpha.vercel.app"

    @Test
    fun `effectiveDebug false when isDebuggable false`() {
        // effectiveDebug = isDebugMode && isDebuggable
        // When isDebuggable=false, effectiveDebug=false regardless of isDebugMode.
        // This means the remote URL is used even if config.debug=true.
        val url =
            UrlPolicy.initialContentUrl(
                queryParams = "",
                effectiveDebug = false, // isDebugMode=true && isDebuggable=false → false
                remoteWebAppBaseUrl = remoteUrl,
            )
        assertEquals("https://self-app-alpha.vercel.app/tunnel/tour/1", url)
    }

    @Test
    fun `effectiveDebug true when both flags true`() {
        val url =
            UrlPolicy.initialContentUrl(
                queryParams = "",
                effectiveDebug = true, // isDebugMode=true && isDebuggable=true → true
                remoteWebAppBaseUrl = remoteUrl,
            )
        assertEquals("http://127.0.0.1:5173/tunnel/tour/1", url)
    }

    @Test
    fun `buildAllowedOriginRules uses UrlPolicy allowedOrigins`() {
        val origins =
            UrlPolicy.allowedOrigins(
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            )
        assertEquals(setOf("https://self-app-alpha.vercel.app"), origins)
    }

    @Test
    fun `buildAllowedOriginRules includes debug origins`() {
        val origins =
            UrlPolicy.allowedOrigins(
                effectiveDebug = true,
                remoteWebAppBaseUrl = remoteUrl,
                devServerUrl = "http://192.168.1.100:3000",
            )
        assertTrue(origins.contains("https://self-app-alpha.vercel.app"))
        assertTrue(origins.contains("http://127.0.0.1:5173"))
        assertTrue(origins.contains("http://192.168.1.100:3000"))
    }
}
