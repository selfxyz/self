// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import java.net.URI
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class RemoteNavigationPolicyTest {
    @Test
    fun `resolvePort defaults https to 443`() {
        assertEquals(443, RemoteNavigationPolicy.resolvePort(URI("https://verify.self.xyz")))
    }

    @Test
    fun `resolvePort defaults http to 80`() {
        assertEquals(80, RemoteNavigationPolicy.resolvePort(URI("http://127.0.0.1")))
    }

    @Test
    fun `resolvePort preserves explicit port`() {
        assertEquals(8443, RemoteNavigationPolicy.resolvePort(URI("https://verify.self.xyz:8443")))
    }

    @Test
    fun `isAllowedRemoteOrigin accepts matching https origin with implicit default port`() {
        assertTrue(
            RemoteNavigationPolicy.isAllowedRemoteOrigin(
                candidateUrl = "https://verify.self.xyz/tunnel/tour/1",
                baseUrl = "https://verify.self.xyz:443",
            ),
        )
    }

    @Test
    fun `isAllowedRemoteOrigin rejects different host`() {
        assertFalse(
            RemoteNavigationPolicy.isAllowedRemoteOrigin(
                candidateUrl = "https://evil.self.xyz/tunnel/tour/1",
                baseUrl = "https://verify.self.xyz",
            ),
        )
    }

    @Test
    fun `isAllowedRemoteOrigin rejects different scheme`() {
        assertFalse(
            RemoteNavigationPolicy.isAllowedRemoteOrigin(
                candidateUrl = "http://verify.self.xyz/tunnel/tour/1",
                baseUrl = "https://verify.self.xyz",
            ),
        )
    }

    @Test
    fun `isAllowedRemoteOrigin rejects different port`() {
        assertFalse(
            RemoteNavigationPolicy.isAllowedRemoteOrigin(
                candidateUrl = "https://verify.self.xyz:8443/tunnel/tour/1",
                baseUrl = "https://verify.self.xyz",
            ),
        )
    }

    @Test
    fun `isAllowedRemoteOrigin rejects blank or invalid base url`() {
        assertFalse(RemoteNavigationPolicy.isAllowedRemoteOrigin("https://verify.self.xyz", ""))
        assertFalse(RemoteNavigationPolicy.isAllowedRemoteOrigin("https://verify.self.xyz", "http://verify.self.xyz"))
        assertFalse(RemoteNavigationPolicy.isAllowedRemoteOrigin("https://verify.self.xyz", "https:///missing-host"))
    }

    @Test
    fun `buildRemoteEntryUrl appends hosted entry path and query`() {
        assertEquals(
            "https://verify.self.xyz/tunnel/tour/1?foo=bar",
            RemoteNavigationPolicy.buildRemoteEntryUrl("https://verify.self.xyz/", "foo=bar"),
        )
    }

    @Test
    fun `buildRemoteEntryUrl rejects non https and blank host`() {
        assertNull(RemoteNavigationPolicy.buildRemoteEntryUrl("http://verify.self.xyz", ""))
        assertNull(RemoteNavigationPolicy.buildRemoteEntryUrl("https:///missing-host", ""))
        assertNull(RemoteNavigationPolicy.buildRemoteEntryUrl("   ", ""))
    }
}
