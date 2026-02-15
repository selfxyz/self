package xyz.self.sdk.bridge

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class BridgeMessageTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun bridgeDomain_serializes_to_serial_name() {
        val expected =
            mapOf(
                BridgeDomain.NFC to "nfc",
                BridgeDomain.BIOMETRICS to "biometrics",
                BridgeDomain.SECURE_STORAGE to "secureStorage",
                BridgeDomain.CAMERA to "camera",
                BridgeDomain.CRYPTO to "crypto",
                BridgeDomain.HAPTIC to "haptic",
                BridgeDomain.ANALYTICS to "analytics",
                BridgeDomain.LIFECYCLE to "lifecycle",
                BridgeDomain.DOCUMENTS to "documents",
                BridgeDomain.NAVIGATION to "navigation",
            )
        for ((domain, serialName) in expected) {
            val serialized = json.encodeToString(domain)
            assertEquals("\"$serialName\"", serialized, "Domain $domain should serialize to \"$serialName\"")
        }
        assertEquals(10, BridgeDomain.entries.size, "Should have exactly 10 domain values")
    }

    @Test
    fun bridgeDomain_deserializes_from_string() {
        val cases =
            mapOf(
                "\"nfc\"" to BridgeDomain.NFC,
                "\"biometrics\"" to BridgeDomain.BIOMETRICS,
                "\"secureStorage\"" to BridgeDomain.SECURE_STORAGE,
                "\"camera\"" to BridgeDomain.CAMERA,
                "\"crypto\"" to BridgeDomain.CRYPTO,
                "\"haptic\"" to BridgeDomain.HAPTIC,
                "\"analytics\"" to BridgeDomain.ANALYTICS,
                "\"lifecycle\"" to BridgeDomain.LIFECYCLE,
                "\"documents\"" to BridgeDomain.DOCUMENTS,
                "\"navigation\"" to BridgeDomain.NAVIGATION,
            )
        for ((serialized, expected) in cases) {
            val deserialized = json.decodeFromString<BridgeDomain>(serialized)
            assertEquals(expected, deserialized)
        }
    }

    @Test
    fun bridgeRequest_roundtrip_serialization() {
        val request =
            BridgeRequest(
                type = "request",
                version = 1,
                id = "req-42",
                domain = BridgeDomain.NFC,
                method = "scan",
                params = mapOf("key" to JsonPrimitive("value")),
                timestamp = 1234567890,
            )
        val encoded = json.encodeToString(request)
        val decoded = json.decodeFromString<BridgeRequest>(encoded)
        assertEquals(request, decoded)
    }

    @Test
    fun bridgeRequest_deserializes_from_webview_json() {
        val rawJson =
            """{"type":"request","version":1,"id":"req-1","domain":"haptic","method":"trigger","params":{"intensity":0.5},"timestamp":123}"""
        val request = json.decodeFromString<BridgeRequest>(rawJson)
        assertEquals("req-1", request.id)
        assertEquals(BridgeDomain.HAPTIC, request.domain)
        assertEquals("trigger", request.method)
        assertEquals(1, request.version)
        assertEquals(123L, request.timestamp)
    }

    @Test
    fun bridgeResponse_success_roundtrip() {
        val response =
            BridgeResponse(
                id = "resp-1",
                domain = BridgeDomain.CRYPTO,
                requestId = "req-1",
                success = true,
                data = JsonPrimitive("signed-data"),
            )
        val encoded = json.encodeToString(response)
        val decoded = json.decodeFromString<BridgeResponse>(encoded)
        assertEquals(response.id, decoded.id)
        assertEquals(response.domain, decoded.domain)
        assertEquals(response.requestId, decoded.requestId)
        assertTrue(decoded.success)
        assertEquals(JsonPrimitive("signed-data"), decoded.data)
        assertNull(decoded.error)
    }

    @Test
    fun bridgeResponse_error_roundtrip() {
        val error =
            BridgeError(
                code = "KEY_NOT_FOUND",
                message = "No such key",
            )
        val response =
            BridgeResponse(
                id = "resp-2",
                domain = BridgeDomain.CRYPTO,
                requestId = "req-2",
                success = false,
                error = error,
            )
        val encoded = json.encodeToString(response)
        val decoded = json.decodeFromString<BridgeResponse>(encoded)
        assertEquals(false, decoded.success)
        assertEquals("KEY_NOT_FOUND", decoded.error?.code)
        assertEquals("No such key", decoded.error?.message)
        assertNull(decoded.data)
    }

    @Test
    fun bridgeEvent_roundtrip() {
        val eventData =
            buildJsonObject {
                put("step", "reading")
                put("percent", 50)
            }
        val event =
            BridgeEvent(
                id = "evt-1",
                domain = BridgeDomain.NFC,
                event = "progress",
                data = eventData,
            )
        val encoded = json.encodeToString(event)
        val decoded = json.decodeFromString<BridgeEvent>(encoded)
        assertEquals(event.id, decoded.id)
        assertEquals(event.domain, decoded.domain)
        assertEquals(event.event, decoded.event)
        assertEquals(event.data, decoded.data)
        assertEquals("event", decoded.type)
    }

    @Test
    fun bridgeError_with_and_without_details() {
        val withDetails =
            BridgeError(
                code = "VALIDATION",
                message = "Invalid input",
                details =
                    mapOf(
                        "field" to JsonPrimitive("passport"),
                        "reason" to JsonPrimitive("too short"),
                    ),
            )
        val encoded = json.encodeToString(withDetails)
        val decoded = json.decodeFromString<BridgeError>(encoded)
        assertEquals(2, decoded.details?.size)
        assertEquals(JsonPrimitive("passport"), decoded.details?.get("field"))

        val withoutDetails = BridgeError(code = "GENERIC", message = "Something failed")
        val encoded2 = json.encodeToString(withoutDetails)
        val decoded2 = json.decodeFromString<BridgeError>(encoded2)
        assertNull(decoded2.details)
    }

    @Test
    fun bridgeRequest_default_type_is_request() {
        val request =
            BridgeRequest(
                version = 1,
                id = "req-1",
                domain = BridgeDomain.HAPTIC,
                method = "trigger",
                params = emptyMap(),
                timestamp = 0,
            )
        assertEquals("request", request.type)
    }

    @Test
    fun bridgeResponse_default_type_is_response() {
        val response =
            BridgeResponse(
                id = "resp-1",
                domain = BridgeDomain.HAPTIC,
                requestId = "req-1",
                success = true,
            )
        assertEquals("response", response.type)
        assertEquals(BRIDGE_PROTOCOL_VERSION, response.version)
    }
}
