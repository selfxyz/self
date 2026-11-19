// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * The same vectors as `EnvelopeScriptTests` in the Swift library. There, JavaScriptCore evaluates
 * each script and gets the JSON text back unchanged, so these expected strings are checked by a
 * JavaScript engine and not only typed by hand. Change both together.
 */
class EnvelopeScriptTest {
    private val vectors =
        listOf(
            "{\"a\":1}" to "{\"a\":1}",
            "{\"a\":\"it's\"}" to "{\"a\":\"it\\'s\"}",
            "{\"a\":\"back\\\\slash \\\"quoted\\\"\"}" to "{\"a\":\"back\\\\\\\\slash \\\\\"quoted\\\\\"\"}",
            "{\"a\":\"line\\nbreak\\r\"}" to "{\"a\":\"line\\\\nbreak\\\\r\"}",
            "{\n\"a\": 1\r\n}" to "{\\n\"a\": 1\\r\\n}",
            "{\"a\":\"x\u2028y\u2029z\"}" to "{\"a\":\"x\\u2028y\\u2029z\"}",
            "{\"a\":\"x\\u2028y\"}" to "{\"a\":\"x\\\\u2028y\"}",
            "{\"a\":\"h\u00e9llo \u65e5\u672c \uD83D\uDE00\"}" to "{\"a\":\"h\u00e9llo \u65e5\u672c \uD83D\uDE00\"}",
            "{\"a\":\"\\\\'\"}" to "{\"a\":\"\\\\\\\\\\'\"}",
        )

    @Test
    fun escapesInOnePass() {
        for ((json, escaped) in vectors) {
            assertEquals(escaped, BridgeScript.escape(json))
        }
    }

    @Test
    fun wrapsAResponseAndAnEvent() {
        assertEquals("window.SelfNativeBridge._handleResponse('{\"a\":\"it\\'s\"}')", BridgeScript.response("{\"a\":\"it's\"}"))
        assertEquals("window.SelfNativeBridge._handleEvent('{\"a\":\"it\\'s\"}')", BridgeScript.event("{\"a\":\"it's\"}"))
    }

    @Test
    fun aScriptHoldsNoLineEndAndNoBareQuote() {
        val json = JsonText.write(JsonString("a'b\nc\rd\u2028e\u2029f\\"))
        val script = BridgeScript.response(json)
        val argument = script.removePrefix("window.SelfNativeBridge._handleResponse('").removeSuffix("')")

        assertEquals(false, script.any { it == '\n' || it == '\r' || it == '\u2028' || it == '\u2029' })
        assertEquals(false, Regex("(?<!\\\\)(\\\\\\\\)*'").containsMatchIn(argument))
    }
}
