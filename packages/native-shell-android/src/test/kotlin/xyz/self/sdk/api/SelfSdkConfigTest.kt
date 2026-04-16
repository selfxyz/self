// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertSame

class SelfSdkConfigTest {
    @Test
    fun `config uses expected defaults`() {
        val config =
            SelfSdkConfig(
                verificationId = "ver_123",
                userId = "user_456",
            )

        assertEquals("prod", config.environment)
        assertFalse(config.isDebugMode)
        assertEquals(1, config.version)
    }

    @Test
    fun `launch config preserves config and provider`() {
        val config =
            SelfSdkConfig(
                verificationId = "ver_123",
                userId = "user_456",
                environment = "staging",
            )
        val provider = FakeSecureStorageProvider()

        val launchConfig =
            SelfSdkLaunchConfig(
                config = config,
                secureStorageProvider = provider,
            )

        assertSame(config, launchConfig.config)
        assertSame(provider, launchConfig.secureStorageProvider)
    }

    private class FakeSecureStorageProvider : SecureStorageProvider {
        override fun get(key: String): String? = null

        override fun set(
            key: String,
            value: String,
        ) = Unit

        override fun remove(key: String) = Unit
    }
}
