// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.models

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

object MrzParser {
    // TD3 (passport) MRZ: two lines of 44 characters
    val MRZ_TD3_LINE = Regex("[A-Z0-9<]{44}")

    // TD1 (ID card) MRZ: three lines of 30 characters
    val MRZ_TD1_LINE = Regex("[A-Z0-9<]{30}")

    /**
     * Extract MRZ lines from OCR text. Returns the MRZ lines if found, or null.
     */
    fun extractMrzLines(text: String): List<String>? {
        val cleanedLines =
            text
                .lines()
                .map { it.trim().replace(" ", "").uppercase() }
                .filter { it.isNotEmpty() }

        // Try TD3 (passport) format: 2 lines of 44 chars
        val td3Lines = cleanedLines.filter { MRZ_TD3_LINE.matches(it) }
        if (td3Lines.size >= 2) {
            val first = td3Lines.firstOrNull { it.startsWith("P") || it.startsWith("V") }
            if (first != null) {
                val idx = td3Lines.indexOf(first)
                if (idx >= 0 && idx + 1 < td3Lines.size) {
                    return listOf(td3Lines[idx], td3Lines[idx + 1])
                }
            }
            // Fallback: just take the last two matching lines
            return td3Lines.takeLast(2)
        }

        // Try TD1 (ID card) format: 3 lines of 30 chars
        val td1Lines = cleanedLines.filter { MRZ_TD1_LINE.matches(it) }
        if (td1Lines.size >= 3) {
            return td1Lines.takeLast(3)
        }

        return null
    }

    /**
     * Parse MRZ lines into structured data.
     * Supports TD3 (passport, 2 lines of 44 chars) and TD1 (ID card, 3 lines of 30 chars).
     */
    fun parseMrz(lines: List<String>): JsonElement {
        if (lines.size == 2 && lines[0].length == 44) {
            return parseTd3(lines[0], lines[1])
        }
        if (lines.size == 3 && lines[0].length == 30) {
            return parseTd1(lines[0], lines[1], lines[2])
        }
        return buildJsonObject {
            put("raw", lines.joinToString("\n"))
        }
    }

    fun parseTd3(
        line1: String,
        line2: String,
    ): JsonElement {
        val documentCode = line1.substring(0, 2).trimFiller()
        val issuingState = line1.substring(2, 5)
        val nameField = line1.substring(5, 44)
        val nameParts = nameField.split("<<", limit = 2)
        val surname = nameParts[0].replace("<", " ").trim()
        val givenNames = if (nameParts.size > 1) nameParts[1].replace("<", " ").trim() else ""

        val documentNumber = line2.substring(0, 9).trimFiller()
        val nationality = line2.substring(10, 13)
        val dateOfBirth = line2.substring(13, 19)
        val gender = line2.substring(20, 21).trimFiller()
        val dateOfExpiry = line2.substring(21, 27)
        val personalNumber = line2.substring(28, 42).trimFiller()

        return buildJsonObject {
            put("documentType", documentCode)
            put("issuingState", issuingState)
            put("surname", surname)
            put("givenNames", givenNames)
            put("documentNumber", documentNumber)
            put("nationality", nationality)
            put("dateOfBirth", dateOfBirth)
            put("gender", gender)
            put("dateOfExpiry", dateOfExpiry)
            put("personalNumber", personalNumber)
            put("raw", "$line1\n$line2")
        }
    }

    fun parseTd1(
        line1: String,
        line2: String,
        line3: String,
    ): JsonElement {
        val documentCode = line1.substring(0, 2).trimFiller()
        val issuingState = line1.substring(2, 5)
        val documentNumber = line1.substring(5, 14).trimFiller()

        val dateOfBirth = line2.substring(0, 6)
        val gender = line2.substring(7, 8).trimFiller()
        val dateOfExpiry = line2.substring(8, 14)
        val nationality = line2.substring(15, 18)

        val nameField = line3
        val nameParts = nameField.split("<<", limit = 2)
        val surname = nameParts[0].replace("<", " ").trim()
        val givenNames = if (nameParts.size > 1) nameParts[1].replace("<", " ").trim() else ""

        return buildJsonObject {
            put("documentType", documentCode)
            put("issuingState", issuingState)
            put("documentNumber", documentNumber)
            put("nationality", nationality)
            put("dateOfBirth", dateOfBirth)
            put("gender", gender)
            put("dateOfExpiry", dateOfExpiry)
            put("surname", surname)
            put("givenNames", givenNames)
            put("raw", "$line1\n$line2\n$line3")
        }
    }

    fun trimFiller(s: String): String = s.replace("<", "").trim()
}

private fun String.trimFiller(): String = MrzParser.trimFiller(this)
