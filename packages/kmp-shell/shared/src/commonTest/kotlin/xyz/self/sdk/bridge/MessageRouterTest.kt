// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class MessageRouterTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun routesToCorrectHandler() = runTest {
        val responses = mutableListOf<String>()
        val router = MessageRouter(
            sendToWebView = { responses.add(it) },
        )

        router.register(object : BridgeHandler {
            override val domain = BridgeDomain.NFC
            override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement {
                return buildJsonObject {
                    put("supported", true)
                }
            }
        })

        val request = buildJsonObject {
            put("type", "request")
            put("version", BRIDGE_PROTOCOL_VERSION)
            put("id", "test-req-1")
            put("domain", "nfc")
            put("method", "isSupported")
            put("params", buildJsonObject { })
            put("timestamp", currentTimeMillis())
        }

        router.onMessageReceived(Json.encodeToString(request))

        // Wait for coroutine to complete
        kotlinx.coroutines.delay(100)

        assertTrue(responses.isNotEmpty(), "Should have received a response")
        val responseJs = responses.first()
        assertTrue(responseJs.contains("_handleResponse"), "Response should call _handleResponse")
    }

    @Test
    fun returnsErrorForUnregisteredDomain() = runTest {
        val responses = mutableListOf<String>()
        val router = MessageRouter(
            sendToWebView = { responses.add(it) },
        )

        val request = buildJsonObject {
            put("type", "request")
            put("version", BRIDGE_PROTOCOL_VERSION)
            put("id", "test-req-2")
            put("domain", "haptic")
            put("method", "trigger")
            put("params", buildJsonObject { })
            put("timestamp", currentTimeMillis())
        }

        router.onMessageReceived(Json.encodeToString(request))

        assertTrue(responses.isNotEmpty(), "Should have received an error response")
        assertTrue(
            responses.first().contains("DOMAIN_NOT_REGISTERED"),
            "Error should indicate domain not registered",
        )
    }

    @Test
    fun handlesHandlerException() = runTest {
        val responses = mutableListOf<String>()
        val router = MessageRouter(
            sendToWebView = { responses.add(it) },
        )

        router.register(object : BridgeHandler {
            override val domain = BridgeDomain.BIOMETRICS
            override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement {
                throw BridgeHandlerException(
                    code = "BIOMETRIC_NOT_ENROLLED",
                    message = "No biometrics enrolled on device",
                )
            }
        })

        val request = buildJsonObject {
            put("type", "request")
            put("version", BRIDGE_PROTOCOL_VERSION)
            put("id", "test-req-3")
            put("domain", "biometrics")
            put("method", "authenticate")
            put("params", buildJsonObject { put("reason", "Verify identity") })
            put("timestamp", currentTimeMillis())
        }

        router.onMessageReceived(Json.encodeToString(request))

        kotlinx.coroutines.delay(100)

        assertTrue(responses.isNotEmpty())
        assertTrue(responses.first().contains("BIOMETRIC_NOT_ENROLLED"))
    }

    @Test
    fun pushesEventsToWebView() {
        val responses = mutableListOf<String>()
        val router = MessageRouter(
            sendToWebView = { responses.add(it) },
        )

        router.pushEvent(
            domain = BridgeDomain.NFC,
            event = "scanProgress",
            data = buildJsonObject {
                put("step", "bac")
                put("percent", 10)
            },
        )

        assertTrue(responses.isNotEmpty())
        val js = responses.first()
        assertTrue(js.contains("_handleEvent"))
        assertTrue(js.contains("scanProgress"))
    }

    @Test
    fun escapeForJsHandlesSpecialCharacters() {
        val input = """{"key":"value with 'quotes' and \\ backslash"}"""
        val escaped = MessageRouter.escapeForJs(input)
        assertTrue(escaped.startsWith("'"))
        assertTrue(escaped.endsWith("'"))
        assertTrue(escaped.contains("\\'"))
        assertTrue(escaped.contains("\\\\"))
    }

    @Test
    fun ignoresNonRequestMessages() {
        val responses = mutableListOf<String>()
        val router = MessageRouter(
            sendToWebView = { responses.add(it) },
        )

        // Send a response message (should be ignored)
        val responseMsg = buildJsonObject {
            put("type", "response")
            put("version", BRIDGE_PROTOCOL_VERSION)
            put("id", "resp-1")
            put("domain", "nfc")
            put("requestId", "req-1")
            put("success", true)
            put("timestamp", currentTimeMillis())
        }

        router.onMessageReceived(Json.encodeToString(responseMsg))

        assertTrue(responses.isEmpty(), "Should not route non-request messages")
    }
}
