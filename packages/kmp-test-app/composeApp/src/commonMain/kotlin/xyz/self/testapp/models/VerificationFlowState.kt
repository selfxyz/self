package xyz.self.testapp.models

import kotlinx.serialization.json.JsonElement

/**
 * Sealed class representing the states of the verification flow
 */
sealed class VerificationFlowState {
    /**
     * Initial state: entering or editing passport details
     */
    data class PassportDetails(
        val passportData: PassportData = PassportData(),
        val hasSavedData: Boolean = false,
    ) : VerificationFlowState()

    /**
     * MRZ scanning state
     */
    data class MrzScan(
        val passportData: PassportData,
        val isScanning: Boolean = false,
    ) : VerificationFlowState()

    /**
     * NFC scanning state
     */
    data class NfcScan(
        val passportData: PassportData,
        val isScanning: Boolean = false,
        val progress: String = "",
    ) : VerificationFlowState()

    /**
     * Final result state (success or error)
     */
    data class Result(
        val success: Boolean,
        val jsonResult: JsonElement? = null,
        val errorMessage: String? = null,
        val logs: List<String> = emptyList(),
    ) : VerificationFlowState()

    /**
     * Error state that can occur at any point
     */
    data class Error(
        val message: String,
        val previousState: VerificationFlowState? = null,
    ) : VerificationFlowState()
}
