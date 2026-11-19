// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core

import android.net.Uri
import android.os.Build
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Proves that each library of the build setup works in a unit test. It tests no SDK behaviour. */
@RunWith(RobolectricTestRunner::class)
class ToolchainTest {
    @Serializable
    private data class Sample(
        val name: String,
        val count: Int? = null,
    )

    @Test
    fun robolectricRunsTheCompileSdk() {
        assertEquals(35, Build.VERSION.SDK_INT)
        assertEquals("localhost", Uri.parse("https://localhost/index.html").host)
    }

    @Test
    fun serializationPluginGeneratesSerializers() {
        val text = Json.encodeToString(Sample.serializer(), Sample(name = "a", count = 2))
        assertEquals("""{"name":"a","count":2}""", text)
        assertEquals(Sample(name = "a"), Json.decodeFromString(Sample.serializer(), """{"name":"a"}"""))
    }

    @Test
    fun coroutinesRunOnTheTestScheduler() =
        runTest {
            val value =
                async {
                    delay(60_000)
                    7
                }
            assertEquals(7, value.await())
        }
}
