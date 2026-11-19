// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.self.sdk.core.bridge.fixtures.ExpectedMessage
import xyz.self.sdk.core.bridge.fixtures.Fixture
import xyz.self.sdk.core.bridge.fixtures.FixtureLoader
import xyz.self.sdk.core.bridge.fixtures.FixtureMatcher
import xyz.self.sdk.core.bridge.fixtures.FixturePlaceholders
import xyz.self.sdk.core.bridge.fixtures.FixtureStep
import xyz.self.sdk.core.bridge.generated.BridgeCancelReason

/**
 * Checks the codec against the `envelope` and `envelope-invalid` fixture groups. `RouterFixtureTest`
 * runs the same fixtures through the router. The Swift library has the same cases in
 * `EnvelopeFixtureTests`. Change both together.
 */
class EnvelopeFixtureTest {
    private val fixtures = FixtureLoader.group("envelope") + FixtureLoader.group("envelope-invalid")

    /** The fixtures whose every `send` is a JSON request or cancel the codec reads. */
    private val parsing =
        fixtures.filter { fixture ->
            fixture.steps.all {
                it !is FixtureStep.SendRaw &&
                    (it !is FixtureStep.Send || parses(it))
            }
        }

    private fun parses(step: FixtureStep.Send): Boolean {
        val body = JsonText.write(JsonObject(FixturePlaceholders().fillSend(step.message)))
        return EnvelopeCodec.decode(body).let { it is InboundMessage.Request || it is InboundMessage.Cancel }
    }

    private fun fixture(name: String): Fixture = fixtures.single { it.name == name }

    @Test
    fun everySendThatParsesReadsAsTheMessageItHolds() {
        assertEquals(16, parsing.size)
        for (name in parsing.map { it.name }) {
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
        for (name in fixtures.map { it.name }) {
            val placeholders = FixturePlaceholders()
            for (step in fixture(name).steps.filterIsInstance<FixtureStep.Expect>()) {
                val expected = placeholders.fillExpect(step.message)

                assertEquals(name, emptyList<String>(), FixtureMatcher.mismatches(expected, ExpectedMessage.encode(expected)))
                expects++
            }
        }
        assertTrue(expects > parsing.size)
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
