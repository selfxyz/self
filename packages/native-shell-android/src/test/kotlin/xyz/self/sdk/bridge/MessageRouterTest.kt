// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

@OptIn(ExperimentalCoroutinesApi::class)
class MessageRouterTest {

    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    private fun makeRequest(
        domain: BridgeDomain = BridgeDomain.SECURE_STORAGE,
        method: String = "get",
        params: Map<String, JsonElement> = emptyMap(),
        version: Int = BRIDGE_PROTOCOL_VERSION,
        id: String = "req-1",
    ): String = json.encodeToString(
        BridgeRequest(
            type = "request",
            version = version,
            id = id,
            domain = domain,
            method = method,
            params = params,
            timestamp = 1000L,
        ),
    )

    private fun parseResponse(js: String): BridgeResponse {
        val jsonStr = js
            .removePrefix("window.SelfNativeBridge._handleResponse(")
            .removeSuffix(")")
            .let { unescapeJs(it) }
        return json.decodeFromString<BridgeResponse>(jsonStr)
    }

    private fun unescapeJs(escaped: String): String {
        val inner = escaped.removeSurrounding("'")
        return inner
            .replace("\\\\'", "'")
            .replace("\\\\n", "\n")
            .replace("\\\\r", "\r")
            .replace("\\\\u2028", "\u2028")
            .replace("\\\\u2029", "\u2029")
            .replace("\\\\\\\\", "\\")
    }

    @Test
    fun `unsupported version sends error response`() = runTest {
        val sent = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { sent.add(it) }, scope = this)

        router.onMessageReceived(makeRequest(version = 999))
        advanceUntilIdle()

        assertEquals(1, sent.size)
        val resp = parseResponse(sent[0])
        assertEquals(false, resp.success)
        assertEquals("UNSUPPORTED_VERSION", resp.error?.code)
        assertEquals("req-1", resp.requestId)
    }

    @Test
    fun `unknown domain sends error response`() = runTest {
        val sent = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { sent.add(it) }, scope = this)

        router.onMessageReceived(makeRequest(domain = BridgeDomain.NFC))
        advanceUntilIdle()

        assertEquals(1, sent.size)
        val resp = parseResponse(sent[0])
        assertEquals(false, resp.success)
        assertEquals("DOMAIN_NOT_FOUND", resp.error?.code)
    }

    @Test
    fun `successful handler call sends success response`() = runTest {
        val sent = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { sent.add(it) }, scope = this)
        router.register(StubHandler(BridgeDomain.SECURE_STORAGE, result = JsonPrimitive("ok")))

        router.onMessageReceived(makeRequest())
        advanceUntilIdle()

        assertEquals(1, sent.size)
        val resp = parseResponse(sent[0])
        assertTrue(resp.success)
        assertEquals("req-1", resp.requestId)
    }

    @Test
    fun `handler exception sends error response with code`() = runTest {
        val sent = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { sent.add(it) }, scope = this)
        router.register(StubHandler(
            BridgeDomain.SECURE_STORAGE,
            error = BridgeHandlerException("MISSING_KEY", "Key parameter required"),
        ))

        router.onMessageReceived(makeRequest())
        advanceUntilIdle()

        assertEquals(1, sent.size)
        val resp = parseResponse(sent[0])
        assertEquals(false, resp.success)
        assertEquals("MISSING_KEY", resp.error?.code)
        assertEquals("Key parameter required", resp.error?.message)
    }

    @Test
    fun `generic exception sends INTERNAL_ERROR response`() = runTest {
        val sent = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { sent.add(it) }, scope = this)
        router.register(StubHandler(
            BridgeDomain.SECURE_STORAGE,
            error = RuntimeException("disk full"),
        ))

        router.onMessageReceived(makeRequest())
        advanceUntilIdle()

        assertEquals(1, sent.size)
        val resp = parseResponse(sent[0])
        assertEquals(false, resp.success)
        assertEquals("INTERNAL_ERROR", resp.error?.code)
        assertTrue(resp.error?.message?.contains("disk full") == true)
    }

    @Test
    fun `malformed json is silently dropped`() = runTest {
        val sent = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { sent.add(it) }, scope = this)

        router.onMessageReceived("{not valid json")
        advanceUntilIdle()

        assertTrue(sent.isEmpty())
    }

    @Test
    fun `register replaces existing handler for same domain`() = runTest {
        val sent = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { sent.add(it) }, scope = this)
        router.register(StubHandler(BridgeDomain.SECURE_STORAGE, result = JsonPrimitive("first")))
        router.register(StubHandler(BridgeDomain.SECURE_STORAGE, result = JsonPrimitive("second")))

        router.onMessageReceived(makeRequest())
        advanceUntilIdle()

        val resp = parseResponse(sent[0])
        assertTrue(resp.success)
        assertEquals(JsonPrimitive("second"), resp.data)
    }

    @Test
    fun `pushEvent sends formatted event to webview`() = runTest {
        val sent = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { sent.add(it) }, scope = this)

        router.pushEvent(BridgeDomain.NFC, "tagDetected", JsonPrimitive("abc"))

        assertEquals(1, sent.size)
        assertTrue(sent[0].startsWith("window.SelfNativeBridge._handleEvent("))
    }

    private class StubHandler(
        override val domain: BridgeDomain,
        private val result: JsonElement? = null,
        private val error: Exception? = null,
    ) : BridgeHandler {
        override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
            if (error != null) throw error
            return result
        }
    }
}
