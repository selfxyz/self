// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.models

import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MrzParserTest {
    // --- extractMrzLines ---

    @Test
    fun returns_null_for_empty_text() {
        assertNull(MrzParser.extractMrzLines(""))
    }

    @Test
    fun returns_null_for_non_mrz_text() {
        assertNull(MrzParser.extractMrzLines("This is a regular sentence\nWith multiple lines"))
    }

    @Test
    fun extracts_td3_two_lines() {
        val text =
            """
            P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
            L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04
            """.trimIndent()

        val lines = MrzParser.extractMrzLines(text)
        assertNotNull(lines)
        assertEquals(2, lines.size)
        assertEquals(44, lines[0].length)
        assertEquals(44, lines[1].length)
        assertTrue(lines[0].startsWith("P"))
    }

    @Test
    fun extracts_td1_three_lines() {
        val text =
            """
            I<UTOD231458907<<<<<<<<<<<<<<<
            7408122F1204159UTO<<<<<<<<<<<6
            ERIKSSON<<ANNA<MARIA<<<<<<<<<<
            """.trimIndent()

        val lines = MrzParser.extractMrzLines(text)
        assertNotNull(lines)
        assertEquals(3, lines.size)
        assertEquals(30, lines[0].length)
    }

    @Test
    fun handles_whitespace_and_lowercase() {
        // Lowercase and spaces should be cleaned
        val text =
            """
            p<utoeriksson<<anna<maria<<<<<<<<<<<<<<<<<<<
            l898902c36uto6908061f0608156<<<<<<<<<<<<<<04
            """.trimIndent()

        val lines = MrzParser.extractMrzLines(text)
        assertNotNull(lines)
        assertEquals(2, lines.size)
        // Should be uppercased
        assertTrue(lines[0] == lines[0].uppercase())
    }

    @Test
    fun prefers_P_or_V_prefix_line() {
        // Multiple 44-char lines, the one starting with P should be first
        val text =
            """
            X<DECNOISE<<LINE<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
            P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
            L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04
            """.trimIndent()

        val lines = MrzParser.extractMrzLines(text)
        assertNotNull(lines)
        assertEquals(2, lines.size)
        assertTrue(lines[0].startsWith("P"))
    }

    @Test
    fun fallback_takes_last_two_lines() {
        // Two 44-char lines, neither starting with P or V
        val line1 = "X" + "<".repeat(43) // 44 chars
        val line2 = "Y" + "0".repeat(43) // 44 chars
        val text = "$line1\n$line2"

        val lines = MrzParser.extractMrzLines(text)
        assertNotNull(lines)
        assertEquals(2, lines.size)
    }

    @Test
    fun handles_ocr_noise() {
        // Mix of valid and invalid lines
        val text =
            """
            Some random text
            123
            P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
            OCR garbage line
            L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04
            More text
            """.trimIndent()

        val lines = MrzParser.extractMrzLines(text)
        assertNotNull(lines)
        assertEquals(2, lines.size)
    }

    // --- parseMrz ---

    @Test
    fun dispatches_to_td3_for_two_44char_lines() {
        val td3Lines =
            listOf(
                "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
                "L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04",
            )
        val result = MrzParser.parseMrz(td3Lines)
        val obj = result.jsonObject
        assertEquals("P", obj["documentType"]?.jsonPrimitive?.content)
    }

    @Test
    fun dispatches_to_td1_for_three_30char_lines() {
        val td1Lines =
            listOf(
                "I<UTOD231458907<<<<<<<<<<<<<<<",
                "7408122F1204159UTO<<<<<<<<<<<6",
                "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
            )
        val result = MrzParser.parseMrz(td1Lines)
        val obj = result.jsonObject
        assertEquals("I", obj["documentType"]?.jsonPrimitive?.content)
    }

    @Test
    fun returns_raw_for_unrecognized_format() {
        val weirdLines = listOf("ABCDEF", "123456")
        val result = MrzParser.parseMrz(weirdLines)
        val obj = result.jsonObject
        assertNotNull(obj["raw"])
        assertEquals("ABCDEF\n123456", obj["raw"]?.jsonPrimitive?.content)
    }

    // --- parseTd3 ---

    @Test
    fun parses_icao_example_passport() {
        val line1 =
            "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<< "
                .trim()
                .let { if (it.length < 44) it.padEnd(44, '<') else it.take(44) }
        val line2 = "L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04"

        // Use the real ICAO lines directly
        val result =
            MrzParser.parseTd3(
                "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
                "L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04",
            )
        val obj = result.jsonObject
        assertEquals("P", obj["documentType"]?.jsonPrimitive?.content)
        assertEquals("UTO", obj["issuingState"]?.jsonPrimitive?.content)
        assertEquals("ERIKSSON", obj["surname"]?.jsonPrimitive?.content)
        assertEquals("ANNA MARIA", obj["givenNames"]?.jsonPrimitive?.content)
        assertEquals("L898902C3", obj["documentNumber"]?.jsonPrimitive?.content)
        assertEquals("UTO", obj["nationality"]?.jsonPrimitive?.content)
        assertEquals("690806", obj["dateOfBirth"]?.jsonPrimitive?.content)
        assertEquals("F", obj["gender"]?.jsonPrimitive?.content)
        assertEquals("060815", obj["dateOfExpiry"]?.jsonPrimitive?.content)
    }

    @Test
    fun strips_filler_characters() {
        val result =
            MrzParser.parseTd3(
                "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
                "L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04",
            )
        val obj = result.jsonObject
        // Document number should not contain '<'
        val docNum = obj["documentNumber"]?.jsonPrimitive?.content ?: ""
        assertTrue(!docNum.contains("<"), "Document number should not contain '<': $docNum")
    }

    @Test
    fun handles_no_given_names() {
        // Construct a TD3 line 1 with surname only (no given names after <<)
        val line1 = "P<UTOSMITHSON<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
        val line2 = "L898902C36UTO6908061F0608156<<<<<<<<<<<<<<04"
        val result = MrzParser.parseTd3(line1, line2)
        val obj = result.jsonObject
        assertEquals("SMITHSON", obj["surname"]?.jsonPrimitive?.content)
        assertEquals("", obj["givenNames"]?.jsonPrimitive?.content)
    }

    // --- parseTd1 ---

    @Test
    fun parses_standard_id_card() {
        val result =
            MrzParser.parseTd1(
                "I<UTOD231458907<<<<<<<<<<<<<<<",
                "7408122F1204159UTO<<<<<<<<<<<6",
                "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
            )
        val obj = result.jsonObject
        assertEquals("I", obj["documentType"]?.jsonPrimitive?.content)
        assertEquals("UTO", obj["issuingState"]?.jsonPrimitive?.content)
        assertEquals("D23145890", obj["documentNumber"]?.jsonPrimitive?.content)
        assertEquals("740812", obj["dateOfBirth"]?.jsonPrimitive?.content)
        assertEquals("F", obj["gender"]?.jsonPrimitive?.content)
        assertEquals("120415", obj["dateOfExpiry"]?.jsonPrimitive?.content)
        assertEquals("UTO", obj["nationality"]?.jsonPrimitive?.content)
        assertEquals("ERIKSSON", obj["surname"]?.jsonPrimitive?.content)
        assertEquals("ANNA MARIA", obj["givenNames"]?.jsonPrimitive?.content)
    }

    // --- trimFiller ---

    @Test
    fun removes_angle_brackets_and_trims() {
        assertEquals("ABC", MrzParser.trimFiller("ABC<<<"))
        assertEquals("ABC", MrzParser.trimFiller("<<<ABC<<<"))
    }

    @Test
    fun handles_empty_string() {
        assertEquals("", MrzParser.trimFiller(""))
    }

    @Test
    fun handles_all_fillers() {
        assertEquals("", MrzParser.trimFiller("<<<"))
    }
}
