// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.fixtures

import xyz.self.sdk.core.bridge.JsonNull
import xyz.self.sdk.core.bridge.JsonNumber
import xyz.self.sdk.core.bridge.JsonObject
import xyz.self.sdk.core.bridge.JsonParseException
import xyz.self.sdk.core.bridge.JsonString
import xyz.self.sdk.core.bridge.JsonText
import xyz.self.sdk.core.bridge.JsonValue
import java.util.UUID

/**
 * The native code under test, as the WebView sees it: message bodies in, JSON texts out. The codec
 * alone stands behind it for now. The router takes its place with no change to the runner.
 */
internal interface FixtureSubject {
    /** A message body from the web, as a trusted main-frame message. */
    fun send(body: String)

    /** An action native starts with no message from the web. */
    fun native(action: String)

    /** Moves the fake clock forward. Timers that end inside the step fire before this returns. */
    fun advance(milliseconds: Long)

    /** The JSON text of each response and event native emitted since the last call, in order. */
    fun drain(): List<String>
}

/** Thrown by a subject for a step it cannot run yet. The runner reports the fixture as deferred, not as passed. */
internal class FixtureDeferredException(
    val why: String,
) : Exception(why)

internal sealed interface FixtureOutcome {
    /** Native emitted each `expect`, in order, and nothing else. */
    data object Passed : FixtureOutcome

    data class Failed(
        val problems: List<String>,
    ) : FixtureOutcome

    /** The subject could not run the step at [stepIndex]. Nothing after it ran. */
    data class Deferred(
        val stepIndex: Int,
        val why: String,
    ) : FixtureOutcome
}

/** Replaces the placeholders of BC 11.1, as `fillPlaceholders` in `packages/bridge-schema` does. */
internal class FixturePlaceholders(
    private val timestamp: Double = TIMESTAMP,
    private val createId: () -> String = { UUID.randomUUID().toString() },
) {
    private val ids = mutableMapOf<String, String>()

    fun idFor(label: String): String = ids.getOrPut(label, createId)

    /** A string `id` or `requestId` is a label. `"timestamp": 0` is replaced. No field is added. */
    fun fillSend(message: JsonFields): JsonFields =
        (swapLabel(swapLabel(message, "id"), "requestId")).let {
            if (it["timestamp"] == JsonNumber(0.0)) it + ("timestamp" to JsonNumber(timestamp)) else it
        }

    fun fillExpect(message: JsonFields): JsonFields = swapLabel(message, "requestId")

    private fun swapLabel(
        message: JsonFields,
        field: String,
    ): JsonFields = (message[field] as? JsonString)?.let { message + (field to JsonString(idFor(it.value))) } ?: message

    companion object {
        const val TIMESTAMP = 1_794_650_000_000.0
    }
}

/**
 * Compares a message native emitted with an `expect`. BC 11.1 says a runner compares the listed
 * fields and ignores the message's own `id`, its `timestamp` and `error.message`. The rest is this
 * runner's rule, the same in the Swift library:
 * - Only the fields of the contract are compared. An `expect` can hold a field the contract does
 *   not know, as input for the web runner. Native is not required to emit it.
 * - `null` in an `expect` means native emits no value: the field is absent or `null`.
 * - `data` must be equal as a whole. Of `error`, the `code` and each listed key of `details`.
 */
internal object FixtureMatcher {
    private val comparedFields =
        mapOf(
            "response" to listOf("type", "version", "domain", "requestId", "success", "data", "error"),
            "event" to listOf("type", "version", "domain", "event", "requestId", "data"),
        )

    fun mismatches(
        expected: JsonFields,
        actualText: String,
    ): List<String> {
        val actual =
            try {
                (JsonText.parse(actualText) as? JsonObject)?.members
            } catch (_: JsonParseException) {
                null
            } ?: return listOf("native emitted text that is not a JSON object")
        val type = (expected["type"] as? JsonString)?.value
        val fields = comparedFields[type] ?: return listOf("an expect must be a response or an event, not $type")
        return fields.filter { it in expected }.flatMap { field ->
            if (field == "error") errorMismatches(expected.value(field), actual.value(field)) else mismatch(field, expected, actual)
        }
    }

    private fun errorMismatches(
        expected: JsonValue,
        actual: JsonValue,
    ): List<String> {
        val expectedError = (expected as? JsonObject)?.members ?: return mismatch("error", expected, actual)
        val actualError = (actual as? JsonObject)?.members ?: return listOf("error: expected an object, got ${JsonText.write(actual)}")
        val expectedDetails = (expectedError.value("details") as? JsonObject)?.members.orEmpty()
        val actualDetails = (actualError.value("details") as? JsonObject)?.members.orEmpty()
        return mismatch("code", expectedError, actualError, "error.") +
            expectedDetails.keys.flatMap { mismatch(it, expectedDetails, actualDetails, "error.details.") }
    }

    private fun mismatch(
        field: String,
        expected: JsonFields,
        actual: JsonFields,
        prefix: String = "",
    ): List<String> = mismatch(prefix + field, expected.value(field), actual.value(field))

    private fun mismatch(
        at: String,
        expected: JsonValue,
        actual: JsonValue,
    ): List<String> =
        if (expected ==
            actual
        ) {
            emptyList()
        } else {
            listOf("$at: expected ${JsonText.write(expected)}, got ${JsonText.write(actual)}")
        }

    private fun JsonFields.value(field: String): JsonValue = this[field] ?: JsonNull
}

/** Runs one fixture against a subject, as BC 11.2 says for the Swift and Kotlin libraries. */
internal object FixtureRunner {
    fun run(
        fixture: Fixture,
        subject: FixtureSubject,
    ): FixtureOutcome {
        val placeholders = FixturePlaceholders()
        val emitted = ArrayDeque<String>()
        val problems = mutableListOf<String>()
        fixture.steps.forEachIndexed { index, step ->
            try {
                when (step) {
                    is FixtureStep.Send -> subject.send(JsonText.write(JsonObject(placeholders.fillSend(step.message))))
                    is FixtureStep.SendRaw -> subject.send(step.body)
                    is FixtureStep.Native -> subject.native(step.action)
                    is FixtureStep.Advance -> subject.advance(step.milliseconds)
                    is FixtureStep.Expect -> Unit
                }
            } catch (deferred: FixtureDeferredException) {
                return if (problems.isEmpty()) FixtureOutcome.Deferred(index, deferred.why) else FixtureOutcome.Failed(problems)
            }
            emitted.addAll(subject.drain())
            if (step is FixtureStep.Expect) {
                val actual = emitted.removeFirstOrNull()
                problems +=
                    if (actual == null) {
                        listOf("steps[$index]: native emitted nothing")
                    } else {
                        FixtureMatcher.mismatches(placeholders.fillExpect(step.message), actual).map { "steps[$index]: $it" }
                    }
            }
        }
        problems += emitted.map { "native emitted a message that no step expects: $it" }
        return if (problems.isEmpty()) FixtureOutcome.Passed else FixtureOutcome.Failed(problems)
    }
}
