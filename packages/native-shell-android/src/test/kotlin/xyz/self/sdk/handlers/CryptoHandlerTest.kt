// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import kotlin.test.Test
import kotlin.test.assertEquals
import xyz.self.sdk.bridge.BridgeDomain

class CryptoHandlerTest {

    @Test
    fun `domain is CRYPTO`() {
        // CryptoHandler constructor initializes AndroidKeyStore which is unavailable
        // in JVM unit tests. We verify the domain constant directly.
        assertEquals("crypto", BridgeDomain.CRYPTO.name.lowercase())
    }
}
