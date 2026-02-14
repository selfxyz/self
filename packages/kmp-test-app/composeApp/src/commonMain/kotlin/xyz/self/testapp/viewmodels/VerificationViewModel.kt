package xyz.self.testapp.viewmodels

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.JsonElement
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.models.VerificationFlowState

/**
 * ViewModel managing the verification flow state
 */
class VerificationViewModel : ViewModel() {
    private val _state =
        MutableStateFlow<VerificationFlowState>(
            VerificationFlowState.PassportDetails(),
        )
    val state: StateFlow<VerificationFlowState> = _state.asStateFlow()

    private val _logs = MutableStateFlow<List<String>>(emptyList())
    val logs: StateFlow<List<String>> = _logs.asStateFlow()

    /**
     * Adds a log message to the list
     */
    fun addLog(message: String) {
        _logs.value = _logs.value + message
    }

    /**
     * Clears all logs
     */
    fun clearLogs() {
        _logs.value = emptyList()
    }

    /**
     * Initializes with saved passport data if available
     */
    fun loadSavedData(passportData: PassportData?) {
        if (passportData != null && !passportData.isEmpty()) {
            _state.value =
                VerificationFlowState.PassportDetails(
                    passportData = passportData,
                    hasSavedData = true,
                )
        }
    }

    /**
     * Updates passport data and transitions to MRZ scan
     */
    fun proceedToMrzScan(passportData: PassportData) {
        addLog("Starting MRZ scan with passport: ${passportData.passportNumber}")
        _state.value = VerificationFlowState.MrzScan(passportData)
    }

    /**
     * Updates passport data from MRZ scan and transitions to NFC scan
     */
    fun updateFromMrz(passportData: PassportData) {
        addLog("MRZ scan completed successfully")
        addLog("Passport Number: ${passportData.passportNumber}")
        addLog("Date of Birth: ${passportData.dateOfBirth}")
        addLog("Date of Expiry: ${passportData.dateOfExpiry}")
        _state.value = VerificationFlowState.NfcScan(passportData)
    }

    /**
     * Skips MRZ scan and proceeds directly to NFC scan
     */
    fun skipMrzScan(passportData: PassportData) {
        addLog("Skipping MRZ scan")
        _state.value = VerificationFlowState.NfcScan(passportData)
    }

    /**
     * Updates NFC scan progress
     */
    fun updateNfcProgress(progress: String) {
        val currentState = _state.value
        if (currentState is VerificationFlowState.NfcScan) {
            addLog(progress)
            _state.value =
                currentState.copy(
                    isScanning = true,
                    progress = progress,
                )
        }
    }

    /**
     * Sets the NFC scan result and transitions to result screen
     */
    fun setNfcResult(jsonResult: JsonElement?) {
        if (jsonResult != null) {
            addLog("NFC scan completed successfully")
            _state.value =
                VerificationFlowState.Result(
                    success = true,
                    jsonResult = jsonResult,
                    logs = _logs.value,
                )
        } else {
            addLog("NFC scan failed: No result")
            _state.value =
                VerificationFlowState.Result(
                    success = false,
                    errorMessage = "NFC scan failed: No result",
                    logs = _logs.value,
                )
        }
    }

    /**
     * Sets an error state
     */
    fun setError(message: String) {
        addLog("Error: $message")
        _state.value =
            VerificationFlowState.Error(
                message = message,
                previousState = _state.value,
            )
    }

    /**
     * Resets the flow to start over
     */
    fun reset() {
        clearLogs()
        _state.value = VerificationFlowState.PassportDetails()
    }

    /**
     * Goes back to passport details screen
     */
    fun backToPassportDetails(passportData: PassportData) {
        _state.value =
            VerificationFlowState.PassportDetails(
                passportData = passportData,
                hasSavedData = !passportData.isEmpty(),
            )
    }
}
