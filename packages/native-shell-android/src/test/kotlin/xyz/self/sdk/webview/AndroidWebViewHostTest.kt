// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import android.app.Activity
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import xyz.self.sdk.bridge.MessageRouter
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

@RunWith(RobolectricTestRunner::class)
class AndroidWebViewHostTest {
    private val activity = Robolectric.buildActivity(Activity::class.java).setup().get()

    @Test
    fun `resolveInitialContentUrl prefers hosted url when configured`() {
        val host =
            AndroidWebViewHost(
                context = activity,
                router = MessageRouter(sendToWebView = {}),
            )

        assertEquals(
            "https://verify.self.xyz/v1/tunnel/tour/1?foo=bar",
            host.resolveInitialContentUrl(queryParams = "foo=bar", bundledFallbackAvailable = true),
        )
    }

    @Test
    fun `resolveInitialContentUrl falls back to bundled assets only when remote base url is blank`() {
        val host =
            AndroidWebViewHost(
                context = activity,
                router = MessageRouter(sendToWebView = {}),
                remoteWebAppBaseUrl = "   ",
            )

        assertEquals(
            "https://appassets.androidplatform.net/tunnel/tour/1?foo=bar",
            host.resolveInitialContentUrl(queryParams = "foo=bar", bundledFallbackAvailable = true),
        )
        assertNull(host.resolveInitialContentUrl(queryParams = "foo=bar", bundledFallbackAvailable = false))
    }

    @Test
    fun `shouldAllowNavigation permits default hosted origin`() {
        val host =
            AndroidWebViewHost(
                context = activity,
                router = MessageRouter(sendToWebView = {}),
                remoteWebAppBaseUrl = "   ",
            )

        assertTrue(host.shouldAllowNavigation("https://verify.self.xyz/v1/tunnel/tour/1"))
    }
}
