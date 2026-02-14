package xyz.self.testapp.models

import kotlinx.serialization.Serializable

/**
 * Data class representing passport information for verification flow
 */
@Serializable
data class PassportData(
    val passportNumber: String = "",
    val dateOfBirth: String = "", // Format: YYMMDD
    val dateOfExpiry: String = "", // Format: YYMMDD
) {
    /**
     * Validates that all required fields are filled
     */
    fun isValid(): Boolean =
        passportNumber.isNotBlank() &&
            dateOfBirth.isNotBlank() &&
            dateOfExpiry.isNotBlank() &&
            dateOfBirth.length == 6 &&
            dateOfExpiry.length == 6

    /**
     * Checks if any data has been entered
     */
    fun isEmpty(): Boolean =
        passportNumber.isBlank() &&
            dateOfBirth.isBlank() &&
            dateOfExpiry.isBlank()
}
