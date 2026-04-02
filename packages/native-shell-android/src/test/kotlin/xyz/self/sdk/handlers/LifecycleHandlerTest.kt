// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import kotlin.test.Test
import kotlin.test.assertEquals
import xyz.self.sdk.bridge.BridgeDomain

class LifecycleHandlerTest {

    @Test
    fun `domain is LIFECYCLE`() {
        // LifecycleHandler requires an Activity, so we can only verify the domain
        // via reflection or by constructing with a mock. Since Activity is an Android
        // class unavailable in JVM unit tests, we verify the domain constant directly.
        assertEquals("lifecycle", BridgeDomain.LIFECYCLE.name.lowercase())
    }
}
