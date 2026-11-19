// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.self.sdk.core.bridge.fixtures.CodecFixtureSubject
import xyz.self.sdk.core.bridge.fixtures.ExpectedMessage
import xyz.self.sdk.core.bridge.fixtures.Fixture
import xyz.self.sdk.core.bridge.fixtures.FixtureLoader
import xyz.self.sdk.core.bridge.fixtures.FixtureMatcher
import xyz.self.sdk.core.bridge.fixtures.FixtureOutcome
import xyz.self.sdk.core.bridge.fixtures.FixturePlaceholders
import xyz.self.sdk.core.bridge.fixtures.FixtureRunner
import xyz.self.sdk.core.bridge.fixtures.FixtureStep
import xyz.self.sdk.core.bridge.generated.BridgeCancelReason

/**
 * Runs the `envelope` and `envelope-invalid` fixture groups as far as the codec goes. The Swift
 * library has the same table in `EnvelopeFixtureTests`. Change both together.
 */
class EnvelopeFixtureTest {
    /** The codec alone gives the whole answer: a drop, or INVALID_PARAMS with the field. */
    private val codecComplete =
        listOf(
            "envelope-invalid/method-wrong-type",
            "envelope-invalid/missing-id",
            "envelope-invalid/missing-method",
            "envelope-invalid/missing-params",
            "envelope-invalid/not-an-object",
            "envelope-invalid/not-json",
            "envelope-invalid/params-array",
            "envelope-invalid/params-null",
            "envelope-invalid/timestamp-wrong-type",
        )

    /** The first message parses, so the answer needs the router and a handler. Not run to the end yet. */
    private val needsRouter =
        listOf(
            "envelope-invalid/duplicate-request-id",
            "envelope-invalid/unknown-domain",
            "envelope-invalid/unknown-method",
            "envelope/cancel-reason-absent",
            "envelope/cancel-reason-null",
            "envelope/cancel-with-reason",
            "envelope/event-request-id-absent",
            "envelope/event-request-id-null",
            "envelope/event-with-request-id",
            "envelope/request-response-data",
            "envelope/response-error-details-absent",
            "envelope/response-error-details-null",
            "envelope/response-error-with-details",
            "envelope/response-optionals-absent",
            "envelope/response-optionals-null",
            "envelope/unknown-fields",
        )

    private val fixtures = FixtureLoader.group("envelope") + FixtureLoader.group("envelope-invalid")

    private fun fixture(name: String): Fixture = fixtures.single { it.name == name }

    @Test
    fun everyFixtureOfTheTwoGroupsIsInOneList() {
        assertEquals((codecComplete + needsRouter).sorted(), fixtures.map { it.name }.sorted())
    }

    @Test
    fun theCodecAloneAnswersAnInvalidEnvelope() {
        for (name in codecComplete) {
            assertEquals(name, FixtureOutcome.Passed, FixtureRunner.run(fixture(name), CodecFixtureSubject()))
        }
    }

    @Test
    fun aFixtureWhoseFirstMessageParsesWaitsForTheRouter() {
        for (name in needsRouter) {
            val outcome = FixtureRunner.run(fixture(name), CodecFixtureSubject())

            assertEquals(name, FixtureOutcome.Deferred(0, "a message that parses needs the router"), outcome)
        }
    }

    @Test
    fun everySendOfAWaitingFixtureReadsAsTheMessageItHolds() {
        for (name in needsRouter) {
            val placeholders = FixturePlaceholders()
            for (step in fixture(name).steps.filterIsInstance<FixtureStep.Send>()) {
                val sent = placeholders.fillSend(step.message)
                val body = JsonText.write(JsonObject(sent))

                when (val message = EnvelopeCodec.decode(body)) {
                    is InboundMessage.Request -> {
                        assertEquals(name, JsonString("request"), sent["type"])
                        assertEquals(name, sent["id"], JsonString(message.request.id))
                        assertEquals(name, sent["version"], JsonNumber(message.request.version.toDouble()))
                        assertEquals(name, sent["domain"], JsonString(message.request.domain))
                        assertEquals(name, sent["method"], JsonString(message.request.method))
                        assertEquals(name, sent["params"], JsonObject(message.request.params))
                        assertEquals(name, sent["timestamp"], JsonNumber(message.request.timestamp))
                    }
                    is InboundMessage.Cancel -> {
                        assertEquals(name, JsonString("cancel"), sent["type"])
                        assertEquals(name, sent["id"], JsonString(message.cancel.id))
                        assertEquals(name, sent["requestId"], JsonString(message.cancel.requestId))
                        assertEquals(name, sent["domain"], JsonString(message.cancel.domain))
                        assertEquals(
                            name,
                            (sent["reason"] as? JsonString)?.let { BridgeCancelReason.fromWire(it.value) },
                            message.cancel.reason,
                        )
                    }
                    else -> throw AssertionError("$name: $body read as $message")
                }
            }
        }
    }

    @Test
    fun theWriterGivesAMessageThatMatchesEachExpect() {
        var expects = 0
        for (name in codecComplete + needsRouter) {
            val placeholders = FixturePlaceholders()
            for (step in fixture(name).steps.filterIsInstance<FixtureStep.Expect>()) {
                val expected = placeholders.fillExpect(step.message)

                assertEquals(name, emptyList<String>(), FixtureMatcher.mismatches(expected, ExpectedMessage.encode(expected)))
                expects++
            }
        }
        assertTrue(expects > needsRouter.size)
    }

    @Test
    fun aLabelBecomesOneUuidForTheWholeFixture() {
        val placeholders = FixturePlaceholders()
        val steps = fixture("envelope/cancel-with-reason").steps
        val request = placeholders.fillSend(steps.filterIsInstance<FixtureStep.Send>().first().message)
        val cancel = placeholders.fillSend(steps.filterIsInstance<FixtureStep.Send>().last().message)
        val response = placeholders.fillExpect(steps.filterIsInstance<FixtureStep.Expect>().last().message)
        val uuid = Regex("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")

        assertTrue(uuid.matches((request.getValue("id") as JsonString).value))
        assertEquals(request["id"], cancel["requestId"])
        assertEquals(request["id"], response["requestId"])
        assertNotEquals(request["id"], cancel["id"])
        assertEquals(JsonNumber(FixturePlaceholders.TIMESTAMP), request["timestamp"])
    }
}
