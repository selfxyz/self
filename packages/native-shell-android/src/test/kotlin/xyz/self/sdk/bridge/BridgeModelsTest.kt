// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class BridgeModelsTest {
    private val json =
        Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }

    @Test
    fun `BridgeRequest decodes from JSON`() {
        val raw =
            """
            {
                "type": "request",
                "version": 1,
                "id": "req-1",
                "domain": "secureStorage",
                "method": "get",
                "params": {"key": "token"},
                "timestamp": 1000
            }
            """.trimIndent()

        val req = json.decodeFromString<BridgeRequest>(raw)

        assertEquals("request", req.type)
        assertEquals(1, req.version)
        assertEquals("req-1", req.id)
        assertEquals(BridgeDomain.SECURE_STORAGE, req.domain)
        assertEquals("get", req.method)
        assertEquals(JsonPrimitive("token"), req.params["key"])
        assertEquals(1000L, req.timestamp)
    }

    @Test
    fun `BridgeRequest decodes with empty params`() {
        val raw =
            """
            {
                "type": "request",
                "version": 1,
                "id": "req-2",
                "domain": "lifecycle",
                "method": "ready",
                "params": {},
                "timestamp": 2000
            }
            """.trimIndent()

        val req = json.decodeFromString<BridgeRequest>(raw)

        assertEquals(BridgeDomain.LIFECYCLE, req.domain)
        assertTrue(req.params.isEmpty())
    }

    @Test
    fun `BridgeResponse roundtrips through JSON`() {
        val resp =
            BridgeResponse(
                id = "resp-1",
                domain = BridgeDomain.CRYPTO,
                requestId = "req-1",
                success = true,
                data = JsonPrimitive("result-data"),
            )

        val encoded = json.encodeToString(resp)
        val decoded = json.decodeFromString<BridgeResponse>(encoded)

        assertEquals("response", decoded.type)
        assertEquals(BRIDGE_PROTOCOL_VERSION, decoded.version)
        assertEquals("resp-1", decoded.id)
        assertEquals(BridgeDomain.CRYPTO, decoded.domain)
        assertEquals("req-1", decoded.requestId)
        assertTrue(decoded.success)
        assertEquals(JsonPrimitive("result-data"), decoded.data)
        assertNull(decoded.error)
    }

    @Test
    fun `BridgeResponse with error roundtrips`() {
        val resp =
            BridgeResponse(
                id = "resp-2",
                domain = BridgeDomain.SECURE_STORAGE,
                requestId = "req-2",
                success = false,
                error = BridgeError(code = "MISSING_KEY", message = "Key required"),
            )

        val encoded = json.encodeToString(resp)
        val decoded = json.decodeFromString<BridgeResponse>(encoded)

        assertEquals(false, decoded.success)
        assertNull(decoded.data)
        assertEquals("MISSING_KEY", decoded.error?.code)
        assertEquals("Key required", decoded.error?.message)
    }

    @Test
    fun `BridgeEvent roundtrips through JSON`() {
        val event =
            BridgeEvent(
                id = "evt-1",
                domain = BridgeDomain.NFC,
                event = "tagDetected",
                data = JsonPrimitive("tag-data"),
            )

        val encoded = json.encodeToString(event)
        val decoded = json.decodeFromString<BridgeEvent>(encoded)

        assertEquals("event", decoded.type)
        assertEquals(BRIDGE_PROTOCOL_VERSION, decoded.version)
        assertEquals("evt-1", decoded.id)
        assertEquals(BridgeDomain.NFC, decoded.domain)
        assertEquals("tagDetected", decoded.event)
        assertEquals(JsonPrimitive("tag-data"), decoded.data)
    }

    @Test
    fun `BridgeDomain serializes to lowercase`() {
        val encoded = json.encodeToString(BridgeDomain.SECURE_STORAGE)
        assertEquals("\"secureStorage\"", encoded)
    }

    @Test
    fun `all BridgeDomain values roundtrip`() {
        for (domain in BridgeDomain.entries) {
            val encoded = json.encodeToString(domain)
            val decoded = json.decodeFromString<BridgeDomain>(encoded)
            assertEquals(domain, decoded)
        }
    }
}
