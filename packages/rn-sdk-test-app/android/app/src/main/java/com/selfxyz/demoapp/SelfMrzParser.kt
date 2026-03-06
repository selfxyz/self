// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package com.selfxyz.demoapp

internal data class SelfMrzResult(
    val documentNumber: String,
    val dateOfBirth: String,
    val dateOfExpiry: String,
)

internal object SelfMrzParser {
    private val mrzTd3Line = Regex("[A-Z0-9<]{44}")
    private val mrzTd1Line = Regex("[A-Z0-9<]{30}")

    fun parse(rawText: String): SelfMrzResult? {
        val lines = extractMrzLines(rawText) ?: return null
        return when {
            lines.size == 2 && lines[0].length == 44 -> parseTd3(lines[0], lines[1])
            lines.size == 3 && lines[0].length == 30 -> parseTd1(lines[0], lines[1])
            else -> null
        }
    }

    private fun extractMrzLines(text: String): List<String>? {
        val cleanedLines =
            text
                .lines()
                .map { it.trim().replace(" ", "").uppercase() }
                .filter { it.isNotEmpty() }

        val td3Lines = cleanedLines.filter { mrzTd3Line.matches(it) }
        if (td3Lines.size >= 2) {
            val first = td3Lines.firstOrNull { it.startsWith("P") || it.startsWith("V") }
            if (first != null) {
                val index = td3Lines.indexOf(first)
                if (index >= 0 && index + 1 < td3Lines.size) {
                    return listOf(td3Lines[index], td3Lines[index + 1])
                }
            }
            return td3Lines.takeLast(2)
        }

        val td1Lines = cleanedLines.filter { mrzTd1Line.matches(it) }
        if (td1Lines.size >= 3) {
            return td1Lines.takeLast(3)
        }

        return null
    }

    private fun parseTd3(line1: String, line2: String): SelfMrzResult {
        val documentNumber = trimFiller(line2.substring(0, 9))
        val dateOfBirth = normalizeDate(line2.substring(13, 19))
        val dateOfExpiry = normalizeDate(line2.substring(21, 27))

        return SelfMrzResult(
            documentNumber = documentNumber,
            dateOfBirth = dateOfBirth,
            dateOfExpiry = dateOfExpiry,
        )
    }

    private fun parseTd1(line1: String, line2: String): SelfMrzResult {
        val documentNumber = trimFiller(line1.substring(5, 14))
        val dateOfBirth = normalizeDate(line2.substring(0, 6))
        val dateOfExpiry = normalizeDate(line2.substring(8, 14))

        return SelfMrzResult(
            documentNumber = documentNumber,
            dateOfBirth = dateOfBirth,
            dateOfExpiry = dateOfExpiry,
        )
    }

    private fun trimFiller(value: String): String = value.replace("<", "").trim()

    private fun normalizeDate(value: String): String = value.replace('<', '0')
}
