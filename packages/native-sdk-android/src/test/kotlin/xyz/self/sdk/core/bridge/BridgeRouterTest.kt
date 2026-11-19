// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.self.sdk.core.bridge.fixtures.ManualClock
import xyz.self.sdk.core.bridge.generated.BridgeError
import xyz.self.sdk.core.bridge.generated.BridgeErrorCode
import xyz.self.sdk.core.bridge.generated.BridgeErrorDetails
import xyz.self.sdk.core.bridge.generated.BridgeUnsupportedReason
import xyz.self.sdk.core.bridge.generated.allowedReasons

/** The Swift library has the same cases in `BridgeRouterTests`. Change both together. */
class BridgeRouterTest {
    private val clock = ManualClock()
    private val emitted = mutableListOf<String>()
    private val router = BridgeRouter(emitted::add, clock)
    private val calls = mutableListOf<BridgeCall>()
    private var onCall: (BridgeCall) -> Unit = {}

    init {
        val keep =
            BridgeMethodHandler { call ->
                calls += call
                onCall(call)
            }
        router.register("nfc", mapOf("scanPassport" to keep, "getStatus" to keep))
        router.register("camera", mapOf("scanMRZ" to keep))
        router.register("lifecycle", mapOf("dismiss" to keep))
        router.registerUnavailable("haptic", BridgeUnsupportedReason.NO_HARDWARE)
    }

    private fun send(
        id: String,
        method: String = "nfc.scanPassport",
        params: String = "{}",
        version: Int = 2,
    ) {
        val (domain, name) = method.split('.')
        router.receive(
            """{"type":"request","version":$version,"id":"$id","domain":"$domain","method":"$name","params":$params,"timestamp":1}""",
        )
    }

    private fun cancel(requestId: String) =
        router.receive("""{"type":"cancel","version":2,"id":"c-$requestId","domain":"nfc","requestId":"$requestId","timestamp":1}""")

    private fun drain(): List<Map<String, JsonValue>> = emitted.map { (JsonText.parse(it) as JsonObject).members }.also { emitted.clear() }

    private fun Map<String, JsonValue>.text(key: String) = (this[key] as? JsonString)?.value

    private fun Map<String, JsonValue>.error() = (this["error"] as? JsonObject)?.members

    private fun Map<String, JsonValue>.code() = error()?.text("code")

    private fun Map<String, JsonValue>.details() = (error()?.get("details") as? JsonObject)?.members.orEmpty()

    /** The one message emitted since the last drain: the answer to [requestId] with [code], or a success when null. */
    private fun assertAnswer(
        requestId: String,
        code: String?,
    ): Map<String, JsonValue> {
        val messages = drain()
        assertEquals(messages.toString(), 1, messages.size)
        val message = messages.single()
        assertEquals("response", message.text("type"))
        assertEquals(requestId, message.text("requestId"))
        assertEquals(code, message.code())
        assertEquals(JsonBool(code == null), message["success"])
        return message
    }

    @Test
    fun answersEachRequestExactlyOnce() {
        send("r1", "nfc.getStatus")

        assertTrue(calls.single().succeed(JsonObject(mapOf("enabled" to JsonBool(true)))))
        assertFalse(calls.single().fail(IllegalStateException()))
        assertFalse(calls.single().succeed())
        assertEquals(JsonObject(mapOf("enabled" to JsonBool(true))), assertAnswer("r1", null)["data"])
    }

    @Test
    fun anEventCarriesTheRequestIdAndStopsAfterTheAnswer() {
        send("r1")
        assertTrue(calls.single().emit("scanProgress", mapOf("percent" to JsonNumber(10.0))))
        val event = drain().single()
        calls.single().succeed()
        drain()

        assertEquals("event", event.text("type"))
        assertEquals("r1", event.text("requestId"))
        assertFalse(calls.single().emit("scanProgress"))
        assertEquals(emptyList<String>(), emitted)
    }

    @Test
    fun aCancelWithNoStopActionAnswersAtOnceAndDropsTheLateOutcome() {
        send("r1")
        cancel("r1")

        assertEquals("native", assertAnswer("r1", "CANCELLED").details().text("origin"))
        assertFalse(calls.single().succeed())
        assertEquals(emptyList<String>(), emitted)
    }

    @Test
    fun aCancelRunsTheStopActionAndAnswersWhenTheHandlerDoes() {
        var stops = 0
        onCall = { call -> call.onStop { stops++.also { call.succeed() } } }
        send("r1")
        cancel("r1")

        assertEquals(1, stops)
        assertAnswer("r1", "CANCELLED")
        assertEquals(0, clock.activeTimers)
    }

    @Test
    fun aCancelIsAnsweredWithin2000MsWhenTheHandlerDoesNotStop() {
        onCall = { call -> call.onStop { } }
        send("r1")
        cancel("r1")
        assertFalse(calls.single().emit("scanProgress"))

        clock.advance(1_999)
        assertEquals(emptyList<String>(), emitted)
        clock.advance(1)
        assertAnswer("r1", "CANCELLED")
        assertFalse(calls.single().fail(IllegalStateException()))
    }

    @Test
    fun aStopActionThatThrowsEndsTheRequestAtOnce() {
        onCall = { call -> call.onStop { throw IllegalStateException() } }
        send("r1")
        cancel("r1")

        assertAnswer("r1", "CANCELLED")
    }

    @Test
    fun aStopActionSetAfterTheRequestEndedRunsAtOnce() {
        var stopped = false
        send("r1")
        cancel("r1")
        calls.single().onStop { stopped = true }

        assertTrue(stopped)
        assertAnswer("r1", "CANCELLED")
    }

    @Test
    fun aCancelForAnUnknownOrFinishedRequestAndASecondCancelAreIgnored() {
        cancel("r9")
        send("r1", "nfc.getStatus")
        calls.single().succeed()
        assertAnswer("r1", null)
        cancel("r1")
        send("r2")
        cancel("r2")
        cancel("r2")

        assertAnswer("r2", "CANCELLED")
    }

    @Test
    fun aDuplicateIdIsRefusedAndTheFirstRequestContinues() {
        send("r1")
        send("r1")

        assertEquals("id", assertAnswer("r1", "INVALID_PARAMS").details().text("field"))
        assertEquals(1, calls.size)
        calls.single().succeed()
        assertAnswer("r1", null)
    }

    @Test
    fun aSecondScanInTheSameDomainIsBusyAndAScanInAnotherDomainIsNot() {
        send("r1")
        send("r2")
        assertAnswer("r2", "BUSY")
        send("r3", "camera.scanMRZ")
        send("r4", "nfc.getStatus")
        assertEquals(3, calls.size)

        calls.first().succeed()
        assertAnswer("r1", null)
        send("r5")
        assertEquals(4, calls.size)
    }

    @Test
    fun aNativeOwnedTimeoutUsesTheDefaultOrTimeoutMs() {
        send("r1")
        clock.advance(119_999)
        assertEquals(emptyList<String>(), emitted)
        clock.advance(1)
        assertEquals("native", assertAnswer("r1", "TIMEOUT").details().text("origin"))

        send("r2", params = """{"timeoutMs":500}""")
        clock.advance(500)
        assertAnswer("r2", "TIMEOUT")
    }

    @Test
    fun aTimeoutOfZeroAndAWebOwnedMethodSetNoTimer() {
        send("r1", params = """{"timeoutMs":0}""")
        send("r2", "camera.scanMRZ")
        send("r3", "nfc.getStatus", params = """{"timeoutMs":5}""")

        assertEquals(0, clock.activeTimers)
        clock.advance(1_000_000)
        assertEquals(emptyList<String>(), emitted)
    }

    @Test
    fun theTimerStopsWhenTheRequestIsAnswered() {
        send("r1")
        calls.single().succeed()

        assertEquals(0, clock.activeTimers)
    }

    @Test
    fun anInvalidTimeoutMsIsRefused() {
        for ((index, value) in listOf("\"soon\"", "-1", "1.5", "true").withIndex()) {
            send("r$index", params = """{"timeoutMs":$value}""")

            assertEquals(value, "timeoutMs", assertAnswer("r$index", "INVALID_PARAMS").details().text("field"))
        }
        assertEquals(0, calls.size)
    }

    @Test
    fun aFailureKeepsItsCodeAndAnyOtherExceptionIsAnInternalError() {
        send("r1", "nfc.getStatus")
        calls.last().fail(BridgeFailure.forReason("nfc_disabled", "off")!!)
        assertEquals("nfc_disabled", assertAnswer("r1", "UNAVAILABLE").details().text("reason"))

        send("r2", "nfc.getStatus")
        calls.last().fail(IllegalStateException("secret text"))
        val error = assertAnswer("r2", "INTERNAL_ERROR").error()!!
        assertFalse(error.text("message")!!.contains("secret"))

        onCall = { throw IllegalArgumentException() }
        send("r3", "nfc.getStatus")
        assertAnswer("r3", "INTERNAL_ERROR")
    }

    @Test
    fun aResultThatIsNotValidJsonIsAnInternalError() {
        send("r1", "nfc.getStatus")
        calls.single().succeed(JsonNumber(Double.NaN))

        assertAnswer("r1", "INTERNAL_ERROR")
    }

    @Test
    fun eachReasonMapsToTheOneCodeThatListsItAndAWrongReasonIsRefused() {
        for (code in BridgeErrorCode.entries) {
            for (reason in code.allowedReasons) {
                assertEquals(reason, code, BridgeFailure.forReason(reason, "m")!!.error.code)
            }
        }
        assertNull(BridgeFailure.forReason("something_else", "m"))
        assertThrows(IllegalArgumentException::class.java) {
            BridgeFailure(BridgeError(BridgeErrorCode.FAILED, "m", BridgeErrorDetails(reason = "nfc_disabled")))
        }
    }

    @Test
    fun anUnknownDomainOrMethodOrAnUnavailableDomainIsUnsupported() {
        send("r1", "wallet.open")
        assertEquals("unknown_domain", assertAnswer("r1", "UNSUPPORTED").details().text("reason"))
        send("r2", "nfc.scan")
        assertEquals("unknown_method", assertAnswer("r2", "UNSUPPORTED").details().text("reason"))
        send("r3", "haptic.trigger")
        assertEquals("no_hardware", assertAnswer("r3", "UNSUPPORTED").details().text("reason"))
    }

    @Test
    fun aWrongMajorIsRefusedExceptForDismiss() {
        send("r1", "nfc.getStatus", version = 3)
        val answer = assertAnswer("r1", "UNSUPPORTED_VERSION")
        assertEquals(JsonNumber(2.0), answer["version"])
        assertEquals(JsonArray(listOf(JsonNumber(2.0))), answer.details()["supported"])

        send("r2", "lifecycle.dismiss", params = """{"reason":"user_cancel"}""", version = 1)
        assertEquals("dismiss", calls.single().method)
    }

    @Test
    fun anInvalidRequestAtAWrongMajorIsRefusedForTheMajor() {
        router.receive("""{"type":"request","version":3,"id":"r1","domain":"nfc","method":"getStatus","timestamp":1}""")
        assertAnswer("r1", "UNSUPPORTED_VERSION")

        router.receive("""{"type":"request","version":2,"id":"r2","method":"getStatus","params":{},"timestamp":1}""")
        val answer = assertAnswer("r2", "INVALID_PARAMS")
        assertEquals("domain", answer.details().text("field"))
        assertEquals("lifecycle", answer.text("domain"))
    }

    @Test
    fun dismissCancelsEveryOtherPendingRequestFirst() {
        send("r1")
        send("r2", "camera.scanMRZ")
        send("r3", "lifecycle.dismiss", params = """{"reason":"user_cancel"}""")

        assertEquals(listOf("r1", "r2"), drain().map { it.text("requestId") })
        assertEquals("dismiss", calls.last().method)
    }

    @Test
    fun cancelActiveScanStopsTheScanOfThatDomainOnly() {
        send("r1")
        send("r2", "nfc.getStatus")
        send("r3", "camera.scanMRZ")
        router.cancelActiveScan("nfc")

        assertAnswer("r1", "CANCELLED")
    }

    @Test
    fun cancelAllEndsEveryPendingRequest() {
        send("r1")
        send("r2", "camera.scanMRZ")
        router.cancelAll()

        assertEquals(listOf("CANCELLED", "CANCELLED"), drain().map { it.code() })
    }

    @Test
    fun aPageChangeStopsTheWorkAndSendsNothing() {
        var stops = 0
        onCall = { call -> call.onStop { stops++ } }
        send("r1")
        send("r2", "camera.scanMRZ")
        router.pageChanged()

        assertEquals(2, stops)
        assertFalse(calls.first().succeed())
        assertFalse(calls.first().emit("scanProgress"))
        clock.advance(1_000_000)
        assertEquals(emptyList<String>(), emitted)
        send("r1")
        assertEquals(3, calls.size)
    }
}
