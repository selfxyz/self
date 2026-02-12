// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.nfc

/**
 * Pure Kotlin MRZ key derivation utilities.
 *
 * These functions compute the BAC (Basic Access Control) keys used to
 * authenticate with the passport chip. The derivation follows ICAO 9303
 * specifications for computing check digits and MRZ information strings.
 */
object MrzKeyUtils {

    /**
     * Compute the MRZ information string used for BAC key derivation.
     *
     * The MRZ information is: documentNumber + checkDigit + dateOfBirth + checkDigit + dateOfExpiry + checkDigit
     *
     * @param documentNumber The passport/document number
     * @param dateOfBirth Date of birth in YYMMDD format
     * @param dateOfExpiry Date of expiry in YYMMDD format
     * @return The MRZ information string
     */
    fun computeMrzInfo(
        documentNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
    ): String {
        val paddedDocNum = padDocumentNumber(documentNumber)
        val docNumCheck = computeCheckDigit(paddedDocNum)
        val dobCheck = computeCheckDigit(dateOfBirth)
        val doeCheck = computeCheckDigit(dateOfExpiry)

        return "$paddedDocNum$docNumCheck$dateOfBirth$dobCheck$dateOfExpiry$doeCheck"
    }

    /**
     * Pad a document number to 9 characters with '<' fill characters
     * as per ICAO 9303 specification.
     */
    fun padDocumentNumber(documentNumber: String): String {
        return if (documentNumber.length < 9) {
            documentNumber.padEnd(9, '<')
        } else {
            documentNumber
        }
    }

    /**
     * Compute the ICAO 9303 check digit for a given string.
     *
     * Uses the standard weighting pattern [7, 3, 1] repeating.
     * Characters are mapped to numeric values:
     * - '0'-'9' → 0-9
     * - 'A'-'Z' → 10-35
     * - '<' → 0
     */
    fun computeCheckDigit(input: String): Int {
        val weights = intArrayOf(7, 3, 1)
        var sum = 0

        for (i in input.indices) {
            val value = charToValue(input[i])
            sum += value * weights[i % 3]
        }

        return sum % 10
    }

    /**
     * Map a single MRZ character to its numeric value per ICAO 9303.
     */
    private fun charToValue(c: Char): Int {
        return when {
            c in '0'..'9' -> c - '0'
            c in 'A'..'Z' -> c - 'A' + 10
            c == '<' -> 0
            else -> 0
        }
    }

    /**
     * Validate that a date string is in YYMMDD format.
     */
    fun isValidDate(date: String): Boolean {
        if (date.length != 6) return false
        if (!date.all { it.isDigit() }) return false

        val month = date.substring(2, 4).toInt()
        val day = date.substring(4, 6).toInt()

        return month in 1..12 && day in 1..31
    }
}
