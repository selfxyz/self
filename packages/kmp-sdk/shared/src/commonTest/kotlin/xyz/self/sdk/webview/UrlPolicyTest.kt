// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class UrlPolicyTest {
    private val remoteUrl = "https://self-app-alpha.vercel.app"

    @Test
    fun releaseInitialUrlUsesRemoteHttps() {
        val url =
            UrlPolicy.initialContentUrl(
                queryParams = "",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            )
        assertEquals("https://self-app-alpha.vercel.app/tunnel/tour/1", url)
    }

    @Test
    fun debugInitialUrlUsesLocalhost() {
        val url =
            UrlPolicy.initialContentUrl(
                queryParams = "",
                effectiveDebug = true,
                remoteWebAppBaseUrl = remoteUrl,
            )
        assertEquals("http://127.0.0.1:5173/tunnel/tour/1", url)
    }

    @Test
    fun debugWithDevServerUsesDevServer() {
        val url =
            UrlPolicy.initialContentUrl(
                queryParams = "",
                effectiveDebug = true,
                remoteWebAppBaseUrl = remoteUrl,
                devServerUrl = "http://192.168.1.100:3000",
            )
        assertEquals("http://192.168.1.100:3000/tunnel/tour/1", url)
    }

    @Test
    fun queryParamsAppended() {
        val url =
            UrlPolicy.initialContentUrl(
                queryParams = "foo=bar&baz=1",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            )
        assertEquals("https://self-app-alpha.vercel.app/tunnel/tour/1?foo=bar&baz=1", url)
    }

    @Test
    fun releaseRejectsHttpBaseUrl() {
        assertFailsWith<IllegalArgumentException> {
            UrlPolicy.initialContentUrl(
                queryParams = "",
                effectiveDebug = false,
                remoteWebAppBaseUrl = "http://self-app-alpha.vercel.app",
            )
        }
    }

    @Test
    fun navigationAllowsRemoteOrigin() {
        assertTrue(
            UrlPolicy.isAllowedNavigationUrl(
                "https://self-app-alpha.vercel.app/tunnel/tour/1",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun navigationAllowsDidit() {
        assertTrue(
            UrlPolicy.isAllowedNavigationUrl(
                "https://verify.didit.me/session/123",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun navigationAllowsLocalhostInDebug() {
        assertTrue(
            UrlPolicy.isAllowedNavigationUrl(
                "http://127.0.0.1:5173/tunnel/tour/1",
                effectiveDebug = true,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun navigationRejectsArbitraryOrigins() {
        assertFalse(
            UrlPolicy.isAllowedNavigationUrl(
                "https://evil.com/tunnel/tour/1",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
        assertFalse(
            UrlPolicy.isAllowedNavigationUrl(
                "http://example.com/test",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun bridgeTrustAcceptsRemoteOrigin() {
        assertTrue(
            UrlPolicy.isTrustedBridgeOrigin(
                "https://self-app-alpha.vercel.app/tunnel/tour/1",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun bridgeTrustRejectsDidit() {
        assertFalse(
            UrlPolicy.isTrustedBridgeOrigin(
                "https://verify.didit.me/session/123",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun bridgeTrustRejectsArbitrary() {
        assertFalse(
            UrlPolicy.isTrustedBridgeOrigin(
                "https://evil.com/tunnel/tour/1",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun diditOnNonStandardPortIsRejected() {
        assertFalse(
            UrlPolicy.isAllowedNavigationUrl(
                "https://verify.didit.me:8443/session/123",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun portNormalizationDefaultHttps() {
        val components = parseUrl("https://example.com")
        checkNotNull(components)
        assertEquals(443, UrlPolicy.resolvedPort(components))
    }

    @Test
    fun portNormalizationDefaultHttp() {
        val components = parseUrl("http://example.com")
        checkNotNull(components)
        assertEquals(80, UrlPolicy.resolvedPort(components))
    }

    @Test
    fun portNormalizationExplicit() {
        val components = parseUrl("https://example.com:8443")
        checkNotNull(components)
        assertEquals(8443, UrlPolicy.resolvedPort(components))
    }

    @Test
    fun malformedUrlReturnsNull() {
        assertNull(parseUrl("not a url ://"))
    }

    @Test
    fun nullUrlIsRejectedByAllChecks() {
        assertFalse(UrlPolicy.isAllowedNavigationUrl(null, effectiveDebug = false, remoteWebAppBaseUrl = remoteUrl))
        assertFalse(UrlPolicy.isTrustedBridgeOrigin(null, effectiveDebug = false, remoteWebAppBaseUrl = remoteUrl))
        assertFalse(UrlPolicy.isTrustedPermissionOrigin(null, effectiveDebug = false, remoteWebAppBaseUrl = remoteUrl))
    }

    @Test
    fun permissionOriginAllowsDiditUnlikeBridge() {
        assertTrue(
            UrlPolicy.isTrustedPermissionOrigin(
                "https://verify.didit.me/session/123",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
        assertFalse(
            UrlPolicy.isTrustedBridgeOrigin(
                "https://verify.didit.me/session/123",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun canonicalOriginOmitsDefaultPort() {
        val components = parseUrl("https://example.com:443/path")
        checkNotNull(components)
        assertEquals("https://example.com", UrlPolicy.canonicalOrigin(components))
    }

    @Test
    fun canonicalOriginIncludesNonDefaultPort() {
        val components = parseUrl("https://example.com:8443/path")
        checkNotNull(components)
        assertEquals("https://example.com:8443", UrlPolicy.canonicalOrigin(components))
    }

    @Test
    fun allowedOriginsContainsRemoteInRelease() {
        val origins =
            UrlPolicy.allowedOrigins(
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            )
        assertEquals(setOf("https://self-app-alpha.vercel.app"), origins)
    }

    @Test
    fun allowedOriginsContainsLocalhostAndDevServerInDebug() {
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

    @Test
    fun devServerTrailingSlashTrimmed() {
        val url =
            UrlPolicy.initialContentUrl(
                queryParams = "",
                effectiveDebug = true,
                remoteWebAppBaseUrl = remoteUrl,
                devServerUrl = "http://192.168.1.100:3000/",
            )
        assertEquals("http://192.168.1.100:3000/tunnel/tour/1", url)
    }

    @Test
    fun localhostNotAllowedInRelease() {
        assertFalse(
            UrlPolicy.isAllowedNavigationUrl(
                "http://127.0.0.1:5173/tunnel/tour/1",
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            ),
        )
    }

    @Test
    fun navigationAllowedOriginsIncludesDidit() {
        val origins =
            UrlPolicy.navigationAllowedOrigins(
                effectiveDebug = false,
                remoteWebAppBaseUrl = remoteUrl,
            )
        assertTrue(origins.contains("https://self-app-alpha.vercel.app"))
        assertTrue(origins.contains("https://verify.didit.me"))
    }

    @Test
    fun navigationAllowedOriginsIncludesDebugOrigins() {
        val origins =
            UrlPolicy.navigationAllowedOrigins(
                effectiveDebug = true,
                remoteWebAppBaseUrl = remoteUrl,
                devServerUrl = "http://192.168.1.100:3000",
            )
        assertTrue(origins.contains("https://self-app-alpha.vercel.app"))
        assertTrue(origins.contains("https://verify.didit.me"))
        assertTrue(origins.contains("http://127.0.0.1:5173"))
        assertTrue(origins.contains("http://192.168.1.100:3000"))
    }
}
