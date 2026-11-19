// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.fixtures

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import xyz.self.sdk.core.bridge.JsonObject
import xyz.self.sdk.core.bridge.JsonString
import xyz.self.sdk.core.bridge.JsonText

/** The Swift library has the same cases in `FixtureRunnerTests`. Change both together. */
class FixtureRunnerTest {
    /** Answers each send with the texts `makeAnswer` gives for the id of the message. */
    private class AnsweringSubject(
        private val makeAnswer: (String) -> List<String>,
    ) : FixtureSubject {
        val sent = mutableListOf<String>()
        private val emitted = mutableListOf<String>()

        override fun send(body: String) {
            sent += body
            val id = (JsonText.parse(body) as JsonObject).members.getValue("id") as JsonString
            emitted += makeAnswer(id.value)
        }

        override fun native(action: String) = Unit

        override fun advance(milliseconds: Long) = Unit

        override fun drain(): List<String> = emitted.toList().also { emitted.clear() }
    }

    private fun parse(text: String): Fixture = FixtureParser.parse(JsonText.parse(text), "test")

    private fun fields(text: String): JsonFields = (JsonText.parse(text) as JsonObject).members

    private val request =
        "{\"type\":\"request\",\"version\":2,\"id\":\"r1\",\"domain\":\"nfc\",\"method\":\"getStatus\"," +
            "\"params\":{},\"timestamp\":0}"
    private val expect =
        "{\"type\":\"response\",\"version\":2,\"domain\":\"nfc\",\"requestId\":\"r1\",\"success\":false,\"data\":null," +
            "\"error\":{\"code\":\"UNAVAILABLE\",\"details\":{\"reason\":\"nfc_disabled\"},\"retryAfterMs\":0},\"durationMs\":12}"
    private val fixture =
        parse("{\"name\":\"a/b\",\"given\":{\"capabilities\":\"full\"},\"steps\":[{\"send\":$request},{\"expect\":$expect}]}")

    private fun answer(
        requestId: String,
        changes: String = "",
    ): String {
        val base =
            "{\"type\":\"response\",\"version\":2,\"id\":\"x\",\"domain\":\"nfc\",\"requestId\":\"$requestId\",\"success\":false," +
                "\"error\":{\"code\":\"UNAVAILABLE\",\"message\":\"off\",\"details\":{\"reason\":\"nfc_disabled\",\"nativeCode\":3}},\"timestamp\":9}"
        return JsonText.write(JsonObject(fields(base) + fields("{$changes}")))
    }

    private fun run(makeAnswer: (String) -> List<String>): FixtureOutcome = FixtureRunner.run(fixture, AnsweringSubject(makeAnswer))

    private fun problems(outcome: FixtureOutcome): List<String> = (outcome as FixtureOutcome.Failed).problems

    @Test
    fun loadsEveryFixtureCopy() {
        val fixtures = FixtureLoader.loadAll()

        assertTrue(fixtures.map { it.group }.toSet().containsAll(setOf("envelope", "envelope-invalid", "handshake", "version")))
        assertEquals(fixtures.map { it.name }.sorted(), fixtures.map { it.name })
        assertTrue(fixtures.single { it.name == "envelope-invalid/not-json" }.steps.single() is FixtureStep.SendRaw)
        assertEquals(
            listOf("nfc.scanPassport"),
            fixtures
                .single { it.name == "envelope/unknown-fields" }
                .given.provider.keys
                .toList(),
        )
    }

    @Test
    fun passesWhenNativeEmitsEachExpectAndNothingElse() {
        assertEquals(FixtureOutcome.Passed, run { listOf(answer(it)) })
    }

    @Test
    fun sendsTheMessageWithItsPlaceholdersFilled() {
        val subject = AnsweringSubject { emptyList() }
        FixtureRunner.run(fixture, subject)
        val sent = fields(subject.sent.single())

        assertEquals(fields(request) - "id" - "timestamp", sent - "id" - "timestamp")
        assertEquals(JsonText.parse("1794650000000"), sent["timestamp"])
    }

    @Test
    fun ignoresWhatAnExpectDoesNotList() {
        assertEquals(FixtureOutcome.Passed, run { listOf(answer(it, "\"id\":\"other\",\"timestamp\":1,\"extra\":true")) })
    }

    @Test
    fun failsOnADifferentValueOfAContractField() {
        fun problemsWith(changes: String) = problems(run { listOf(answer(it, changes)) })

        assertEquals(listOf("steps[1]: domain: expected \"nfc\", got \"camera\""), problemsWith("\"domain\":\"camera\""))
        assertEquals(1, problems(run { listOf(answer("another-id")) }).size)
        assertEquals(
            listOf("steps[1]: error.code: expected \"UNAVAILABLE\", got \"FAILED\""),
            problemsWith("\"error\":{\"code\":\"FAILED\",\"message\":\"m\",\"details\":{\"reason\":\"nfc_disabled\"}}"),
        )
        assertEquals(
            listOf("steps[1]: error.details.reason: expected \"nfc_disabled\", got null"),
            problemsWith("\"error\":{\"code\":\"UNAVAILABLE\",\"message\":\"m\"}"),
        )
    }

    @Test
    fun aNullInAnExpectMeansNativeEmitsNoValue() {
        assertEquals(FixtureOutcome.Passed, run { listOf(answer(it, "\"data\":null")) })
        assertEquals(listOf("steps[1]: data: expected null, got {}"), problems(run { listOf(answer(it, "\"data\":{}")) }))
    }

    @Test
    fun failsWhenNativeEmitsNothingTooMuchOrTextThatIsNotAnObject() {
        assertEquals(listOf("steps[1]: native emitted nothing"), problems(run { emptyList() }))
        assertEquals(1, problems(run { listOf(answer(it), answer(it)) }).size)
        assertEquals(listOf("steps[1]: native emitted text that is not a JSON object"), problems(run { listOf("[]") }))
    }

    @Test
    fun reportsAStepTheSubjectCannotRunAsDeferred() {
        val native =
            parse("{\"name\":\"a/b\",\"given\":{\"capabilities\":\"full\"},\"steps\":[{\"send\":\"x\"},{\"native\":\"system_back\"}]}")

        assertEquals(
            FixtureOutcome.Deferred(1, "the native action system_back needs its handler"),
            FixtureRunner.run(native, RouterFixtureSubject(native.given)),
        )
    }

    @Test
    fun readsEachStepKindAndTheGivenPart() {
        val read =
            parse(
                "{\"name\":\"nfc/scan-1\",\"given\":{\"capabilities\":\"full\"," +
                    "\"provider\":{\"nfc.scanPassport\":{\"progress\":[{}],\"pending\":true}},\"launch\":{\"mode\":\"embed\"}}," +
                    "\"steps\":[{\"send\":{}},{\"send\":\"raw\"},{\"expect\":{}},{\"native\":\"system_back\"},{\"advance\":1}]}",
            )

        assertEquals("nfc", read.group)
        assertEquals(fields("{\"mode\":\"embed\"}"), read.given.launch)
        assertEquals(
            listOf(
                FixtureStep.Send(emptyMap()),
                FixtureStep.SendRaw("raw"),
                FixtureStep.Expect(emptyMap()),
                FixtureStep.Native("system_back"),
                FixtureStep.Advance(1),
            ),
            read.steps,
        )
    }

    @Test
    fun refusesAFileThatBreaksTheFormat() {
        fun fixtureWith(
            given: String = "{\"capabilities\":\"full\"}",
            steps: String = "[{\"send\":{}}]",
            name: String = "\"a/b\"",
            extra: String = "",
        ) = "{\"name\":$name,\"given\":$given,\"steps\":$steps$extra}"
        val bad =
            listOf(
                "[]",
                fixtureWith(extra = ",\"note\":1"),
                fixtureWith(name = "\"no-group\""),
                fixtureWith(name = "\"a/B\""),
                fixtureWith(given = "{}"),
                fixtureWith(given = "{\"capabilities\":\"\"}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"other\":1}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"launch\":[]}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"launch\":{\"protocolVersion\":2}}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"provider\":{\"scan\":{\"pending\":true}}}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"provider\":{\"nfc.scan\":{}}}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"provider\":{\"nfc.scan\":{\"succeed\":1}}}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"provider\":{\"nfc.scan\":{\"fail\":\"\"}}}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"provider\":{\"nfc.scan\":{\"progress\":[1]}}}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"provider\":{\"nfc.scan\":{\"pending\":false}}}"),
                fixtureWith(given = "{\"capabilities\":\"full\",\"provider\":{\"nfc.scan\":{\"pending\":true,\"fail\":\"x\"}}}"),
                fixtureWith(steps = "[]"),
                fixtureWith(steps = "[{}]"),
                fixtureWith(steps = "[{\"send\":{},\"expect\":{}}]"),
                fixtureWith(steps = "[{\"wait\":1}]"),
                fixtureWith(steps = "[{\"send\":7}]"),
                fixtureWith(steps = "[{\"expect\":\"raw\"}]"),
                fixtureWith(steps = "[{\"native\":\"\"}]"),
                fixtureWith(steps = "[{\"advance\":0}]"),
                fixtureWith(steps = "[{\"advance\":1.5}]"),
            )
        for (text in bad) {
            assertThrows(text, FixtureFormatException::class.java) { parse(text) }
        }
    }
}
