package xyz.self.sdk.bridge

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
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
}
