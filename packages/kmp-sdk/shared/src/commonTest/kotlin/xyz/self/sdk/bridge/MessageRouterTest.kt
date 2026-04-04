// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.bridge

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import xyz.self.sdk.testutil.FakeBridgeHandler
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class MessageRouterTest {
    @Test
    fun routes_to_registered_handler() =
        runTest {
            val responses = mutableListOf<String>()
            val testScope = TestScope(UnconfinedTestDispatcher(testScheduler))
            val router =
                MessageRouter(
                    sendToWebView = { responses.add(it) },
                    scope = testScope,
                )

            router.register(
                object : BridgeHandler {
                    override val domain = BridgeDomain.HAPTIC

                    override suspend fun handle(
                        method: String,
                        params: Map<String, JsonElement>,
                    ): JsonElement = JsonPrimitive("ok")
                },
            )

            val request =
                """
                {"type":"request","version":1,"id":"req-1","domain":"haptic","method":"trigger","params":{},"timestamp":123}
                """.trimIndent()

            router.onMessageReceived(request)

            assertEquals(1, responses.size)
            assertTrue(responses[0].contains("_handleResponse"))
            assertTrue(responses[0].contains("\"success\":true"))
        }

    @Test
    fun returns_error_for_unknown_domain() =
        runTest {
            val responses = mutableListOf<String>()
            val router = MessageRouter(sendToWebView = { responses.add(it) })

            val request =
                """
                {"type":"request","version":1,"id":"req-1","domain":"haptic","method":"trigger","params":{},"timestamp":123}
                """.trimIndent()

            router.onMessageReceived(request)

            assertEquals(1, responses.size)
            assertTrue(responses[0].contains("DOMAIN_NOT_FOUND"))
        }

    @Test
    fun returns_error_when_handler_throws() =
        runTest {
            val responses = mutableListOf<String>()
            val testScope = TestScope(UnconfinedTestDispatcher(testScheduler))
            val router =
                MessageRouter(
                    sendToWebView = { responses.add(it) },
                    scope = testScope,
                )

            router.register(
                object : BridgeHandler {
                    override val domain = BridgeDomain.CRYPTO

                    override suspend fun handle(
                        method: String,
                        params: Map<String, JsonElement>,
                    ): JsonElement? = throw BridgeHandlerException("KEY_NOT_FOUND", "No such key")
                },
            )

            val request =
                """
                {"type":"request","version":1,"id":"req-2","domain":"crypto","method":"sign","params":{},"timestamp":123}
                """.trimIndent()

            router.onMessageReceived(request)

            assertEquals(1, responses.size)
            assertTrue(responses[0].contains("KEY_NOT_FOUND"))
            assertTrue(responses[0].contains("\"success\":false"))
        }

    @Test
    fun escapeForJs_handles_special_chars() {
        val input = """{"key":"it's a test"}"""
        val escaped = MessageRouter.escapeForJs(input)
        assertTrue(escaped.startsWith("'"))
        assertTrue(escaped.endsWith("'"))
        // Single quotes in the content should be escaped
        assertTrue(escaped.contains("\\'"))
    }

    @Test
    fun drops_malformed_messages() {
        val responses = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { responses.add(it) })

        router.onMessageReceived("this is not json")

        assertEquals(0, responses.size)
    }

    @Test
    fun drops_messages_from_untrusted_origins_before_dispatch() =
        runTest {
            val responses = mutableListOf<String>()
            val testScope = TestScope(UnconfinedTestDispatcher(testScheduler))
            val router =
                MessageRouter(
                    sendToWebView = { responses.add(it) },
                    scope = testScope,
                )
            val handler = FakeBridgeHandler(domain = BridgeDomain.HAPTIC, response = JsonPrimitive("ok"))
            router.register(handler)

            val untrustedJson =
                """{"type":"request","version":1,"id":"req-1","domain":"haptic","method":"trigger","params":{},"timestamp":123}"""
            router.onMessageReceived(rawJson = untrustedJson, isTrustedSource = false)

            assertEquals(0, responses.size)
            assertEquals(0, handler.invocations.size)
        }

    @Test
    fun pushEvent_sends_handleEvent_to_webview() {
        val responses = mutableListOf<String>()
        val router = MessageRouter(sendToWebView = { responses.add(it) })

        router.pushEvent(
            BridgeDomain.NFC,
            "progress",
            JsonPrimitive("reading"),
        )

        assertEquals(1, responses.size)
        assertTrue(responses[0].contains("_handleEvent"))
        assertTrue(responses[0].contains("\"nfc\""))
        assertTrue(responses[0].contains("\"progress\""))
    }

    @Test
    fun handles_multiple_concurrent_requests() =
        runTest {
            val responses = mutableListOf<String>()
            val testScope = TestScope(UnconfinedTestDispatcher(testScheduler))
            val router =
                MessageRouter(
                    sendToWebView = { responses.add(it) },
                    scope = testScope,
                )

            val handler =
                FakeBridgeHandler(
                    domain = BridgeDomain.HAPTIC,
                    response = JsonPrimitive("ok"),
                )
            router.register(handler)

            repeat(3) { i ->
                router.onMessageReceived(
                    """{"type":"request","version":1,"id":"req-$i","domain":"haptic","method":"trigger","params":{},"timestamp":123}""",
                )
            }

            assertEquals(3, responses.size)
            assertEquals(3, handler.invocations.size)
        }

    @Test
    fun routes_to_correct_handler_among_multiple() =
        runTest {
            val responses = mutableListOf<String>()
            val testScope = TestScope(UnconfinedTestDispatcher(testScheduler))
            val router =
                MessageRouter(
                    sendToWebView = { responses.add(it) },
                    scope = testScope,
                )

            val nfcHandler = FakeBridgeHandler(domain = BridgeDomain.NFC, response = JsonPrimitive("nfc"))
            val hapticHandler = FakeBridgeHandler(domain = BridgeDomain.HAPTIC, response = JsonPrimitive("haptic"))
            val cryptoHandler = FakeBridgeHandler(domain = BridgeDomain.CRYPTO, response = JsonPrimitive("crypto"))

            router.register(nfcHandler)
            router.register(hapticHandler)
            router.register(cryptoHandler)

            router.onMessageReceived(
                """{"type":"request","version":1,"id":"req-1","domain":"haptic","method":"trigger","params":{},"timestamp":123}""",
            )

            assertEquals(1, hapticHandler.invocations.size)
            assertEquals(0, nfcHandler.invocations.size)
            assertEquals(0, cryptoHandler.invocations.size)
        }

    @Test
    fun later_registration_replaces_earlier() =
        runTest {
            val responses = mutableListOf<String>()
            val testScope = TestScope(UnconfinedTestDispatcher(testScheduler))
            val router =
                MessageRouter(
                    sendToWebView = { responses.add(it) },
                    scope = testScope,
                )

            val handlerA = FakeBridgeHandler(domain = BridgeDomain.NFC, response = JsonPrimitive("A"))
            val handlerB = FakeBridgeHandler(domain = BridgeDomain.NFC, response = JsonPrimitive("B"))

            router.register(handlerA)
            router.register(handlerB)

            router.onMessageReceived(
                """{"type":"request","version":1,"id":"req-1","domain":"nfc","method":"scan","params":{},"timestamp":123}""",
            )

            assertEquals(0, handlerA.invocations.size)
            assertEquals(1, handlerB.invocations.size)
        }

    @Test
    fun response_contains_matching_requestId() =
        runTest {
            val responses = mutableListOf<String>()
            val testScope = TestScope(UnconfinedTestDispatcher(testScheduler))
            val router =
                MessageRouter(
                    sendToWebView = { responses.add(it) },
                    scope = testScope,
                )

            router.register(FakeBridgeHandler(domain = BridgeDomain.HAPTIC, response = JsonPrimitive("ok")))

            router.onMessageReceived(
                """{"type":"request","version":1,"id":"my-unique-req-id","domain":"haptic","method":"trigger","params":{},"timestamp":123}""",
            )

            assertEquals(1, responses.size)
            assertTrue(responses[0].contains("\"requestId\":\"my-unique-req-id\""))
        }

    @Test
    fun escapeForJs_handles_backslashes() {
        val input = """{"path":"C:\Users\test"}"""
        val escaped = MessageRouter.escapeForJs(input)
        // Backslashes should be doubled
        assertTrue(escaped.contains("\\\\"))
    }

    @Test
    fun escapeForJs_handles_empty_string() {
        val escaped = MessageRouter.escapeForJs("")
        assertEquals("''", escaped)
    }

    @Test
    fun generic_exception_returns_internal_error() =
        runTest {
            val responses = mutableListOf<String>()
            val testScope = TestScope(UnconfinedTestDispatcher(testScheduler))
            val router =
                MessageRouter(
                    sendToWebView = { responses.add(it) },
                    scope = testScope,
                )

            router.register(
                FakeBridgeHandler(
                    domain = BridgeDomain.CRYPTO,
                    error = RuntimeException("unexpected failure"),
                ),
            )

            router.onMessageReceived(
                """{"type":"request","version":1,"id":"req-1","domain":"crypto","method":"sign","params":{},"timestamp":123}""",
            )

            assertEquals(1, responses.size)
            assertTrue(responses[0].contains("INTERNAL_ERROR"))
            assertTrue(responses[0].contains("unexpected failure"))
            assertTrue(responses[0].contains("\"success\":false"))
        }
}
