// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

/** The Swift library has the same cases in `EnvelopeJSONTextTests`. Change both together. */
class EnvelopeJsonTextTest {
    private fun obj(vararg members: Pair<String, JsonValue>) = JsonObject(mapOf(*members))

    private fun num(value: Double) = JsonNumber(value)

    @Test
    fun readsEveryKindOfValue() {
        assertEquals(
            obj(
                "null" to JsonNull,
                "bool" to JsonArray(listOf(JsonBool(true), JsonBool(false))),
                "number" to num(-12.5),
                "string" to JsonString("a"),
                "object" to obj(),
                "array" to JsonArray(emptyList()),
            ),
            JsonText.parse(
                " {\"null\":null,\"bool\":[true,false],\t\"number\":-12.5,\r\n\"string\":\"a\",\"object\":{ },\"array\":[ ]} ",
            ),
        )
    }

    @Test
    fun aRepeatedKeyKeepsItsLastValue() {
        assertEquals(obj("a" to num(2.0)), JsonText.parse("{\"a\":1,\"a\":2}"))
    }

    @Test
    fun readsNumbersAsDoubles() {
        assertEquals(num(0.0), JsonText.parse("0"))
        assertEquals(num(-0.0), JsonText.parse("-0"))
        assertEquals(num(1500.0), JsonText.parse("1.5e3"))
        assertEquals(num(0.015), JsonText.parse("15E-3"))
        assertEquals(num(1_794_650_000_012.0), JsonText.parse("1794650000012"))
        assertEquals(num(9_007_199_254_740_992.0), JsonText.parse("9007199254740993"))
    }

    @Test
    fun readsStringEscapes() {
        assertEquals(JsonString("\"\\/\b\u000C\n\r\t"), JsonText.parse("\"\\\"\\\\\\/\\b\\f\\n\\r\\t\""))
        assertEquals(JsonString("A\u00e9\u2028"), JsonText.parse("\"\\u0041\\u00e9\\u2028\""))
        assertEquals(JsonString("h\u00e9llo \u65e5\u672c"), JsonText.parse("\"h\u00e9llo \u65e5\u672c\""))
        assertEquals(JsonString("\uD83D\uDE00"), JsonText.parse("\"\\ud83d\\ude00\""))
        assertEquals(JsonString("\uD83D\uDE00"), JsonText.parse("\"\\uD83D\\uDE00\""))
    }

    @Test
    fun halfASurrogatePairReadsAsTheReplacementCharacter() {
        assertEquals(JsonString("\uFFFD"), JsonText.parse("\"\\ud83d\""))
        assertEquals(JsonString("\uFFFDx"), JsonText.parse("\"\\ud83dx\""))
        assertEquals(JsonString("\uFFFDA"), JsonText.parse("\"\\ud83d\\u0041\""))
        assertEquals(JsonString("\uFFFD\uFFFD"), JsonText.parse("\"\\ude00\\ud83d\""))
        assertEquals(JsonString("\uFFFD\uD83D\uDE00"), JsonText.parse("\"\\ud83d\\ud83d\\ude00\""))
    }

    @Test
    fun rejectsTextThatIsNotJson() {
        val bad =
            listOf(
                "",
                " ",
                "{",
                "[",
                "[1,]",
                "{\"a\":1,}",
                "{a:1}",
                "{\"a\"}",
                "{\"a\" 1}",
                "[1 2]",
                "'a'",
                "\"a",
                "\"a\\x\"",
                "\"a\\u12\"",
                "\"a\\u12g4\"",
                "\"line\nbreak\"",
                "\"tab\tin\"",
                "nul",
                "True",
                "true false",
                "{} x",
                "\uFEFF{}",
                "NaN",
                "Infinity",
                "01",
                "1.",
                ".5",
                "+1",
                "-",
                "1e",
                "1e+",
                "0x10",
                "1E400",
                "-1E400",
                "undefined",
            )
        for (text in bad) {
            assertThrows(text, JsonParseException::class.java) { JsonText.parse(text) }
        }
    }

    @Test
    fun rejectsNestingDeeperThanTheLimitWithoutOverflowingTheStack() {
        fun nested(depth: Int) = "[".repeat(depth) + "]".repeat(depth)

        fun nestedObjects(depth: Int) = "{\"a\":".repeat(depth) + "1" + "}".repeat(depth)

        JsonText.parse(nested(JsonText.MAX_DEPTH))
        JsonText.parse(nestedObjects(JsonText.MAX_DEPTH))
        assertThrows(JsonParseException::class.java) { JsonText.parse(nested(JsonText.MAX_DEPTH + 1)) }
        assertThrows(JsonParseException::class.java) { JsonText.parse(nestedObjects(JsonText.MAX_DEPTH + 1)) }
        assertThrows(JsonParseException::class.java) { JsonText.parse("[".repeat(200_000)) }
    }

    @Test
    fun writesKeysInSortedOrderAndNoSpace() {
        assertEquals(
            "{\"a\":[null,true,false],\"b\":{\"y\":\"\",\"z\":1},\"c\":[]}",
            JsonText.write(
                obj(
                    "c" to JsonArray(emptyList()),
                    "b" to obj("z" to num(1.0), "y" to JsonString("")),
                    "a" to JsonArray(listOf(JsonNull, JsonBool(true), JsonBool(false))),
                ),
            ),
        )
    }

    @Test
    fun writesAWholeNumberWithNoFractionAndNoExponent() {
        assertEquals("2", JsonText.write(num(2.0)))
        assertEquals("-7", JsonText.write(num(-7.0)))
        assertEquals("0", JsonText.write(num(-0.0)))
        assertEquals("1794650000012", JsonText.write(num(1_794_650_000_012.0)))
        assertEquals("9007199254740992", JsonText.write(num(9_007_199_254_740_992.0)))
        assertEquals("-9007199254740992", JsonText.write(num(-9_007_199_254_740_992.0)))
        assertEquals("1.5", JsonText.write(num(1.5)))
    }

    @Test
    fun aNumberOutsideTheWholeNumberRangeStillReadsBackAsTheSameDouble() {
        for (value in listOf(0.1, -2.5e-7, 1e22, 1.7976931348623157e308, 5e-324, 9_007_199_254_740_994.0)) {
            assertEquals(num(value), JsonText.parse(JsonText.write(num(value))))
        }
    }

    @Test
    fun refusesToWriteANumberThatIsNotFinite() {
        for (value in listOf(Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY)) {
            assertThrows(IllegalArgumentException::class.java) { JsonText.write(num(value)) }
        }
    }

    @Test
    fun writesStringEscapes() {
        assertEquals(
            "\"\\\"\\\\/\\n\\r\\t\\u0000\\u0008\\u001f\"",
            JsonText.write(JsonString("\"\\/\n\r\t\u0000\b\u001f")),
        )
        assertEquals(
            "\"h\u00e9 \u65e5 \uD83D\uDE00 \u2028 \u007f '\"",
            JsonText.write(JsonString("h\u00e9 \u65e5 \uD83D\uDE00 \u2028 \u007f '")),
        )
    }

    @Test
    fun aValueReadsBackEqualAfterAWrite() {
        val value =
            obj(
                "text" to JsonString("it's \"quoted\" \\ \n \u2029 \uD83D\uDE00 \u0001"),
                "list" to JsonArray(listOf(num(1.0), num(0.25), JsonNull, obj("deep" to JsonArray(listOf(JsonBool(false)))))),
                "" to JsonString(""),
            )

        assertEquals(value, JsonText.parse(JsonText.write(value)))
    }

    @Test
    fun wholeNumberTakesNoFractionAndNothingAboveTwoToTheFiftyThree() {
        assertEquals(2L, JsonText.wholeNumber(2.0))
        assertEquals(-9_007_199_254_740_992L, JsonText.wholeNumber(-9_007_199_254_740_992.0))
        assertEquals(null, JsonText.wholeNumber(2.5))
        assertEquals(null, JsonText.wholeNumber(9_007_199_254_740_994.0))
        assertEquals(null, JsonText.wholeNumber(1e300))
    }
}
