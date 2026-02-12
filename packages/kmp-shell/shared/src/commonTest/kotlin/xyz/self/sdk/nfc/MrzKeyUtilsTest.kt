// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.nfc

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MrzKeyUtilsTest {

    @Test
    fun computeCheckDigitForDocumentNumber() {
        // Known test vectors from ICAO 9303
        // "L898902C<" -> check digit = 3
        assertEquals(3, MrzKeyUtils.computeCheckDigit("L898902C<"))
    }

    @Test
    fun computeCheckDigitForDate() {
        // "740812" -> check digit = 2
        assertEquals(2, MrzKeyUtils.computeCheckDigit("740812"))
        // "120415" -> check digit = 9
        assertEquals(9, MrzKeyUtils.computeCheckDigit("120415"))
    }

    @Test
    fun computeCheckDigitForAllDigits() {
        // "520727" -> check digit = 4
        assertEquals(4, MrzKeyUtils.computeCheckDigit("520727"))
    }

    @Test
    fun padDocumentNumberShort() {
        assertEquals("ABC123<<<", MrzKeyUtils.padDocumentNumber("ABC123"))
    }

    @Test
    fun padDocumentNumberExact9() {
        assertEquals("ABC123456", MrzKeyUtils.padDocumentNumber("ABC123456"))
    }

    @Test
    fun padDocumentNumberLongerThan9() {
        // Document numbers > 9 chars should not be truncated
        assertEquals("ABC1234567", MrzKeyUtils.padDocumentNumber("ABC1234567"))
    }

    @Test
    fun computeMrzInfoCombinesCorrectly() {
        val result = MrzKeyUtils.computeMrzInfo(
            documentNumber = "L898902C",
            dateOfBirth = "740812",
            dateOfExpiry = "120415",
        )

        // L898902C< (padded to 9) + check(3) + 740812 + check(2) + 120415 + check(9)
        assertEquals("L898902C<374081221204159", result)
    }

    @Test
    fun isValidDateAcceptsValid() {
        assertTrue(MrzKeyUtils.isValidDate("900101"))
        assertTrue(MrzKeyUtils.isValidDate("001231"))
        assertTrue(MrzKeyUtils.isValidDate("251115"))
    }

    @Test
    fun isValidDateRejectsInvalid() {
        assertFalse(MrzKeyUtils.isValidDate(""))
        assertFalse(MrzKeyUtils.isValidDate("12345"))     // too short
        assertFalse(MrzKeyUtils.isValidDate("1234567"))   // too long
        assertFalse(MrzKeyUtils.isValidDate("abcdef"))    // not digits
        assertFalse(MrzKeyUtils.isValidDate("901301"))    // month 13
        assertFalse(MrzKeyUtils.isValidDate("900132"))    // day 32
        assertFalse(MrzKeyUtils.isValidDate("900001"))    // month 0
        assertFalse(MrzKeyUtils.isValidDate("900100"))    // day 0
    }

    @Test
    fun checkDigitForFillerCharacters() {
        // '<' has value 0
        assertEquals(0, MrzKeyUtils.computeCheckDigit("<<<"))
    }

    @Test
    fun checkDigitWeightingPattern() {
        // Verify the [7, 3, 1] weighting pattern
        // 'A' = 10, so "A" with weights [7] = 10*7 = 70, 70 % 10 = 0
        assertEquals(0, MrzKeyUtils.computeCheckDigit("A"))

        // "AB" = 10*7 + 11*3 = 70 + 33 = 103, 103 % 10 = 3
        assertEquals(3, MrzKeyUtils.computeCheckDigit("AB"))

        // "ABC" = 10*7 + 11*3 + 12*1 = 70 + 33 + 12 = 115, 115 % 10 = 5
        assertEquals(5, MrzKeyUtils.computeCheckDigit("ABC"))
    }
}
