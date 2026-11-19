// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.fixtures

import xyz.self.sdk.core.bridge.JsonArray
import xyz.self.sdk.core.bridge.JsonBool
import xyz.self.sdk.core.bridge.JsonNumber
import xyz.self.sdk.core.bridge.JsonObject
import xyz.self.sdk.core.bridge.JsonString
import xyz.self.sdk.core.bridge.JsonText
import xyz.self.sdk.core.bridge.JsonValue

internal typealias JsonFields = Map<String, JsonValue>

/** One conformance fixture (BC 11.1). The format is in the README of `packages/bridge-schema`. */
internal data class Fixture(
    val name: String,
    val given: FixtureGiven,
    val steps: List<FixtureStep>,
) {
    val group: String get() = name.substringBefore('/')
}

internal data class FixtureGiven(
    val capabilities: String,
    /** What the fake hardware does, keyed by `<domain>.<method>`. Each entry has passed the format check. */
    val provider: Map<String, JsonFields>,
    val launch: JsonFields?,
)

internal sealed interface FixtureStep {
    data class Send(
        val message: JsonFields,
    ) : FixtureStep

    /** A body that is not a JSON object. */
    data class SendRaw(
        val body: String,
    ) : FixtureStep

    data class Expect(
        val message: JsonFields,
    ) : FixtureStep

    data class Native(
        val action: String,
    ) : FixtureStep

    data class Advance(
        val milliseconds: Long,
    ) : FixtureStep
}

internal class FixtureFormatException(
    message: String,
) : Exception(message)

/** Reads a fixture by the rules of `parseFixture` in `packages/bridge-schema/src/fixture.ts`. */
internal object FixtureParser {
    private val namePattern = Regex("[A-Za-z][A-Za-z0-9-]*/[a-z0-9][a-z0-9-]*")
    private val providerMethodPattern = Regex("[A-Za-z][A-Za-z0-9]*\\.[A-Za-z][A-Za-z0-9]*")
    private val launchKeysNativeOwns = listOf("protocolVersion", "protocolMinor", "capabilities")

    fun parse(
        value: JsonValue,
        source: String,
    ): Fixture {
        fun fail(
            at: String,
            problem: String,
        ): Nothing = throw FixtureFormatException("$source: $at $problem")

        fun JsonFields.rejectUnknownKeys(
            at: String,
            vararg allowed: String,
        ) = keys.firstOrNull { it !in allowed }?.let { fail(at, "has the unknown key \"$it\"") }

        fun provider(value: JsonValue): Map<String, JsonFields> {
            val entries = value.fields ?: fail("given.provider", "must be an object")
            return entries.mapValues { (method, setupValue) ->
                val at = "given.provider[\"$method\"]"
                if (!providerMethodPattern.matches(method)) fail(at, "must be keyed by \"<domain>.<method>\"")
                val setup = setupValue.fields ?: fail(at, "must be an object")
                setup.rejectUnknownKeys(at, "fail", "progress", "pending")
                if (setup.isEmpty()) fail(at, "must say what the fake does")
                setup["fail"]?.let { it.nonEmptyText ?: fail("$at.fail", "must be a non-empty string") }
                setup["progress"]?.let { progress ->
                    val items = (progress as? JsonArray)?.items
                    if (items == null || items.any { it !is JsonObject }) fail("$at.progress", "must be a list of objects")
                }
                setup["pending"]?.let { if (it != JsonBool(true)) fail("$at.pending", "must be true when present") }
                if ("pending" in setup && "fail" in setup) fail(at, "cannot both fail and never finish")
                setup
            }
        }

        fun given(value: JsonValue?): FixtureGiven {
            val fields = value?.fields ?: fail("given", "must be an object")
            fields.rejectUnknownKeys("given", "capabilities", "provider", "launch")
            val launch = fields["launch"]?.let { it.fields ?: fail("given.launch", "must be an object") }
            launchKeysNativeOwns.firstOrNull { launch?.containsKey(it) == true }?.let {
                fail("given.launch", "cannot set \"$it\": it comes from the build and given.capabilities")
            }
            return FixtureGiven(
                capabilities = fields["capabilities"]?.nonEmptyText ?: fail("given.capabilities", "must be a non-empty string"),
                provider = fields["provider"]?.let(::provider).orEmpty(),
                launch = launch,
            )
        }

        fun step(
            value: JsonValue,
            index: Int,
        ): FixtureStep {
            val at = "steps[$index]"
            val (kind, content) =
                value.fields?.entries?.singleOrNull() ?: fail(at, "must hold exactly one of send, expect, native, advance")
            return when (kind) {
                "send" ->
                    when (content) {
                        is JsonObject -> FixtureStep.Send(content.members)
                        is JsonString -> FixtureStep.SendRaw(content.value)
                        else -> fail("$at.send", "must be an object or a string")
                    }
                "expect" -> FixtureStep.Expect(content.fields ?: fail("$at.expect", "must be an object"))
                "native" -> FixtureStep.Native(content.nonEmptyText ?: fail("$at.native", "must be a non-empty string"))
                "advance" ->
                    FixtureStep.Advance(
                        (content as? JsonNumber)?.let { JsonText.wholeNumber(it.value) }?.takeIf { it >= 1 }
                            ?: fail("$at.advance", "must be an integer number of milliseconds, 1 or more"),
                    )
                else -> fail(at, "must hold exactly one of send, expect, native, advance")
            }
        }

        val fields = value.fields ?: fail("a fixture", "must be a JSON object")
        fields.rejectUnknownKeys("the fixture", "name", "given", "steps")
        val name = (fields["name"] as? JsonString)?.value?.takeIf(namePattern::matches) ?: fail("name", "must be \"<group>/<case>\"")
        val steps = (fields["steps"] as? JsonArray)?.items?.takeIf { it.isNotEmpty() } ?: fail("steps", "must be a non-empty list")
        return Fixture(name, given(fields["given"]), steps.mapIndexed { index, step -> step(step, index) })
    }

    private val JsonValue.fields: JsonFields? get() = (this as? JsonObject)?.members

    private val JsonValue.nonEmptyText: String? get() = (this as? JsonString)?.value?.takeIf { it.isNotEmpty() }
}

/** Reads the fixture copies that `packages/bridge-schema` writes into the test resources. */
internal object FixtureLoader {
    private const val ROOT = "bridge-fixtures"

    /** Every fixture, group by group. Throws for a file that is misplaced or does not have the fixture shape. */
    fun loadAll(): List<Fixture> {
        val root = java.io.File(checkNotNull(javaClass.classLoader?.getResource(ROOT)) { "No $ROOT in the test resources" }.toURI())
        return root
            .walkTopDown()
            .filter { it.isFile && !it.name.startsWith(".") }
            .sortedBy { it.path }
            .map { file ->
                val expectedName = file.relativeTo(root).invariantSeparatorsPath.removeSuffix(".json")
                val fixture = FixtureParser.parse(JsonText.parse(file.readText()), file.path)
                if (fixture.name != expectedName) {
                    throw FixtureFormatException("${file.path}: name must be \"$expectedName\", the path of the file")
                }
                fixture
            }.toList()
    }

    fun group(name: String): List<Fixture> = loadAll().filter { it.group == name }
}
