// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import kotlin.math.abs

internal class JsonParseException(
    message: String,
) : Exception(message)

/**
 * Reads and writes [JsonValue] as JSON text (RFC 8259). The Swift library has the same rules, so one
 * body gives the same value on both platforms:
 * - A number is a double, as in `JSON.parse`. A whole number up to 2^53 in size is written with no
 *   fraction and no exponent. A number too large for a double is a parse error.
 * - A key that appears twice in an object keeps its last value, as in `JSON.parse`.
 * - A `\u` escape of half a surrogate pair reads as U+FFFD.
 * - Nesting deeper than [MAX_DEPTH] is a parse error.
 * - Object keys are written in sorted order.
 */
internal object JsonText {
    const val MAX_DEPTH = 128

    /** The largest size at which every whole number is a double: 2^53. */
    const val MAX_SAFE_INTEGER = 9_007_199_254_740_992.0

    @Throws(JsonParseException::class)
    fun parse(text: String): JsonValue = JsonReader(text).readDocument()

    /** Throws [IllegalArgumentException] for a number that is not finite: JSON has no text for it. */
    fun write(value: JsonValue): String = StringBuilder().also { writeValue(value, it) }.toString()

    /** The number as a whole number, or null when it has a fraction or is larger than 2^53. */
    fun wholeNumber(value: Double): Long? = if (value % 1.0 == 0.0 && abs(value) <= MAX_SAFE_INTEGER) value.toLong() else null

    private fun writeValue(
        value: JsonValue,
        out: StringBuilder,
    ) {
        when (value) {
            JsonNull -> out.append("null")
            is JsonBool -> out.append(value.value)
            is JsonNumber -> writeNumber(value.value, out)
            is JsonString -> writeString(value.value, out)
            is JsonArray -> {
                out.append('[')
                value.items.forEachIndexed { index, item ->
                    if (index > 0) out.append(',')
                    writeValue(item, out)
                }
                out.append(']')
            }
            is JsonObject -> {
                out.append('{')
                value.members.keys.sorted().forEachIndexed { index, key ->
                    if (index > 0) out.append(',')
                    writeString(key, out)
                    out.append(':')
                    writeValue(value.members.getValue(key), out)
                }
                out.append('}')
            }
        }
    }

    private fun writeNumber(
        value: Double,
        out: StringBuilder,
    ) {
        require(value.isFinite()) { "JSON has no text for a number that is not finite" }
        val whole = wholeNumber(value)
        if (whole != null) out.append(whole) else out.append(value)
    }

    private fun writeString(
        value: String,
        out: StringBuilder,
    ) {
        out.append('"')
        for (char in value) {
            when {
                char == '"' -> out.append("\\\"")
                char == '\\' -> out.append("\\\\")
                char == '\n' -> out.append("\\n")
                char == '\r' -> out.append("\\r")
                char == '\t' -> out.append("\\t")
                char < ' ' -> out.append("\\u").append(char.code.toString(HEX).padStart(HEX_DIGITS, '0'))
                else -> out.append(char)
            }
        }
        out.append('"')
    }
}

private const val HEX = 16
private const val HEX_DIGITS = 4
private const val REPLACEMENT = '\uFFFD'

private class JsonReader(
    private val text: String,
) {
    private var at = 0

    fun readDocument(): JsonValue {
        val value = readValue(depth = 0)
        skipSpace()
        if (at < text.length) fail("text after the value")
        return value
    }

    private fun fail(problem: String): Nothing = throw JsonParseException("$problem at offset $at")

    private fun skipSpace() {
        while (at < text.length && (text[at] == ' ' || text[at] == '\t' || text[at] == '\n' || text[at] == '\r')) at++
    }

    private fun readValue(depth: Int): JsonValue {
        skipSpace()
        if (at >= text.length) fail("no value")
        return when (val char = text[at]) {
            '{' -> readObject(depth + 1)
            '[' -> readArray(depth + 1)
            '"' -> JsonString(readString())
            't' -> readWord("true", JsonBool(true))
            'f' -> readWord("false", JsonBool(false))
            'n' -> readWord("null", JsonNull)
            else -> if (char == '-' || char.isAsciiDigit()) readNumber() else fail("unexpected character")
        }
    }

    private fun readWord(
        word: String,
        value: JsonValue,
    ): JsonValue {
        if (!text.startsWith(word, at)) fail("unexpected character")
        at += word.length
        return value
    }

    private fun readObject(depth: Int): JsonValue {
        if (depth > JsonText.MAX_DEPTH) fail("nesting too deep")
        at++
        val members = LinkedHashMap<String, JsonValue>()
        skipSpace()
        if (peek() == '}') {
            at++
            return JsonObject(members)
        }
        while (true) {
            skipSpace()
            if (peek() != '"') fail("expected a key")
            val key = readString()
            skipSpace()
            if (peek() != ':') fail("expected ':'")
            at++
            members[key] = readValue(depth)
            skipSpace()
            when (peek()) {
                ',' -> at++
                '}' -> {
                    at++
                    return JsonObject(members)
                }
                else -> fail("expected ',' or '}'")
            }
        }
    }

    private fun readArray(depth: Int): JsonValue {
        if (depth > JsonText.MAX_DEPTH) fail("nesting too deep")
        at++
        val items = ArrayList<JsonValue>()
        skipSpace()
        if (peek() == ']') {
            at++
            return JsonArray(items)
        }
        while (true) {
            items.add(readValue(depth))
            skipSpace()
            when (peek()) {
                ',' -> at++
                ']' -> {
                    at++
                    return JsonArray(items)
                }
                else -> fail("expected ',' or ']'")
            }
        }
    }

    private fun peek(): Char? = text.getOrNull(at)

    private fun readString(): String {
        at++
        val out = StringBuilder()
        while (true) {
            val char = peek() ?: fail("string with no end")
            at++
            when {
                char == '"' -> return out.toString()
                char == '\\' -> readEscape(out)
                char < ' ' -> fail("control character in a string")
                else -> out.append(char)
            }
        }
    }

    private fun readEscape(out: StringBuilder) {
        val char = peek() ?: fail("string with no end")
        at++
        when (char) {
            '"', '\\', '/' -> out.append(char)
            'b' -> out.append('\b')
            'f' -> out.append('\u000C')
            'n' -> out.append('\n')
            'r' -> out.append('\r')
            't' -> out.append('\t')
            'u' -> readUnicodeEscape(out)
            else -> fail("unknown escape")
        }
    }

    private fun readUnicodeEscape(out: StringBuilder) {
        val unit = readHexUnit()
        if (!unit.isSurrogate()) {
            out.append(unit)
            return
        }
        if (unit.isHighSurrogate() && text.startsWith("\\u", at)) {
            val mark = at
            at += 2
            val low = readHexUnit()
            if (low.isLowSurrogate()) {
                out.append(unit).append(low)
                return
            }
            at = mark
        }
        out.append(REPLACEMENT)
    }

    private fun readHexUnit(): Char {
        if (at + HEX_DIGITS > text.length) fail("short \\u escape")
        var code = 0
        repeat(HEX_DIGITS) {
            val digit = Character.digit(text[at], HEX)
            if (digit < 0 || text[at].code > ASCII_MAX) fail("bad \\u escape")
            code = code * HEX + digit
            at++
        }
        return code.toChar()
    }

    private fun readNumber(): JsonValue {
        val start = at
        if (peek() == '-') at++
        when {
            peek() == '0' -> at++
            readDigits() == 0 -> fail("bad number")
        }
        if (peek() == '.') {
            at++
            if (readDigits() == 0) fail("bad number")
        }
        if (peek() == 'e' || peek() == 'E') {
            at++
            if (peek() == '+' || peek() == '-') at++
            if (readDigits() == 0) fail("bad number")
        }
        val value = text.substring(start, at).toDouble()
        if (!value.isFinite()) fail("number too large")
        return JsonNumber(value)
    }

    private fun readDigits(): Int {
        val start = at
        while (peek()?.isAsciiDigit() == true) at++
        return at - start
    }
}

private const val ASCII_MAX = 127

private fun Char.isAsciiDigit(): Boolean = this in '0'..'9'
