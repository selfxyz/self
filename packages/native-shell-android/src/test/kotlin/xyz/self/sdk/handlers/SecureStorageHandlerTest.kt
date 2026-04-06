// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import xyz.self.sdk.api.SecureStorageProvider
import xyz.self.sdk.bridge.BridgeHandlerException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

@OptIn(ExperimentalCoroutinesApi::class)
class SecureStorageHandlerTest {
    @Test
    fun `get returns stored value`() =
        runTest {
            val provider = FakeSecureStorageProvider()
            provider.values["token"] = "abc123"
            val handler = SecureStorageHandler(provider)

            val result = handler.handle("get", mapOf("key" to JsonPrimitive("token"))) as JsonObject

            assertEquals(JsonPrimitive("abc123"), result["value"])
        }

    @Test
    fun `get returns null when key is missing`() =
        runTest {
            val handler = SecureStorageHandler(FakeSecureStorageProvider())

            val result = handler.handle("get", mapOf("key" to JsonPrimitive("missing"))) as JsonObject

            assertEquals(JsonNull, result["value"])
        }

    @Test
    fun `set stores value`() =
        runTest {
            val provider = FakeSecureStorageProvider()
            val handler = SecureStorageHandler(provider)

            val result =
                handler.handle(
                    "set",
                    mapOf("key" to JsonPrimitive("token"), "value" to JsonPrimitive("abc123")),
                )

            assertNull(result)
            assertEquals("abc123", provider.values["token"])
        }

    @Test
    fun `remove deletes value`() =
        runTest {
            val provider = FakeSecureStorageProvider()
            provider.values["token"] = "abc123"
            val handler = SecureStorageHandler(provider)

            val result = handler.handle("remove", mapOf("key" to JsonPrimitive("token")))

            assertNull(result)
            assertEquals(false, provider.values.containsKey("token"))
        }

    @Test
    fun `missing key raises bridge error`() =
        runTest {
            val handler = SecureStorageHandler(FakeSecureStorageProvider())

            val error =
                assertFailsWith<BridgeHandlerException> {
                    handler.handle("get", emptyMap())
                }

            assertEquals("MISSING_KEY", error.code)
        }

    @Test
    fun `missing value raises bridge error`() =
        runTest {
            val handler = SecureStorageHandler(FakeSecureStorageProvider())

            val error =
                assertFailsWith<BridgeHandlerException> {
                    handler.handle("set", mapOf("key" to JsonPrimitive("token")))
                }

            assertEquals("MISSING_VALUE", error.code)
        }

    @Test
    fun `unknown method raises bridge error`() =
        runTest {
            val handler = SecureStorageHandler(FakeSecureStorageProvider())

            val error =
                assertFailsWith<BridgeHandlerException> {
                    handler.handle("unknown", emptyMap())
                }

            assertEquals("METHOD_NOT_FOUND", error.code)
        }

    private class FakeSecureStorageProvider : SecureStorageProvider {
        val values = mutableMapOf<String, String>()

        override fun get(key: String): String? = values[key]

        override fun set(
            key: String,
            value: String,
        ) {
            values[key] = value
        }

        override fun remove(key: String) {
            values.remove(key)
        }
    }
}
