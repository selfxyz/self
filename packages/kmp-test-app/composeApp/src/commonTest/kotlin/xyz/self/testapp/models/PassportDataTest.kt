package xyz.self.testapp.models

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PassportDataTest {
    @Test
    fun isValid_true_for_valid_data() {
        val data =
            PassportData(
                passportNumber = "L898902C3",
                dateOfBirth = "690806",
                dateOfExpiry = "060815",
            )
        assertTrue(data.isValid())
    }

    @Test
    fun isValid_false_when_passport_number_blank() {
        val data =
            PassportData(
                passportNumber = "",
                dateOfBirth = "690806",
                dateOfExpiry = "060815",
            )
        assertFalse(data.isValid())
    }

    @Test
    fun isValid_false_when_dob_wrong_length() {
        val tooShort =
            PassportData(
                passportNumber = "AB123",
                dateOfBirth = "69080",
                dateOfExpiry = "060815",
            )
        assertFalse(tooShort.isValid())

        val tooLong =
            PassportData(
                passportNumber = "AB123",
                dateOfBirth = "6908061",
                dateOfExpiry = "060815",
            )
        assertFalse(tooLong.isValid())
    }

    @Test
    fun isValid_false_when_doe_wrong_length() {
        val tooShort =
            PassportData(
                passportNumber = "AB123",
                dateOfBirth = "690806",
                dateOfExpiry = "06081",
            )
        assertFalse(tooShort.isValid())

        val tooLong =
            PassportData(
                passportNumber = "AB123",
                dateOfBirth = "690806",
                dateOfExpiry = "0608155",
            )
        assertFalse(tooLong.isValid())
    }

    @Test
    fun isEmpty_true_for_default() {
        assertTrue(PassportData().isEmpty())
    }

    @Test
    fun isEmpty_false_when_any_field_filled() {
        assertFalse(PassportData(passportNumber = "X").isEmpty())
        assertFalse(PassportData(dateOfBirth = "123456").isEmpty())
        assertFalse(PassportData(dateOfExpiry = "123456").isEmpty())
    }

    @Test
    fun serialization_roundtrip() {
        val json = Json { ignoreUnknownKeys = true }
        val data =
            PassportData(
                passportNumber = "L898902C3",
                dateOfBirth = "690806",
                dateOfExpiry = "060815",
            )
        val encoded = json.encodeToString(data)
        val decoded = json.decodeFromString<PassportData>(encoded)
        assertTrue(decoded.isValid())
        assertFalse(decoded.isEmpty())
        kotlin.test.assertEquals(data, decoded)
    }
}
