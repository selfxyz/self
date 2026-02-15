package xyz.self.testapp.viewmodels

import kotlinx.serialization.json.JsonPrimitive
import xyz.self.testapp.models.PassportData
import xyz.self.testapp.models.VerificationFlowState
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

class VerificationViewModelTest {
    private val validPassport =
        PassportData(
            passportNumber = "L898902C3",
            dateOfBirth = "690806",
            dateOfExpiry = "060815",
        )

    private fun createViewModel() = VerificationViewModel()

    // --- Initial state ---

    @Test
    fun initial_state_is_passport_details() {
        val vm = createViewModel()
        val state = vm.state.value
        assertIs<VerificationFlowState.PassportDetails>(state)
        assertEquals(PassportData(), state.passportData)
        assertFalse(state.hasSavedData)
    }

    @Test
    fun initial_logs_are_empty() {
        val vm = createViewModel()
        assertTrue(vm.logs.value.isEmpty())
    }

    // --- loadSavedData ---

    @Test
    fun loadSavedData_with_valid_data_sets_hasSavedData() {
        val vm = createViewModel()
        vm.loadSavedData(validPassport)
        val state = vm.state.value
        assertIs<VerificationFlowState.PassportDetails>(state)
        assertTrue(state.hasSavedData)
        assertEquals(validPassport, state.passportData)
    }

    @Test
    fun loadSavedData_with_null_does_nothing() {
        val vm = createViewModel()
        vm.loadSavedData(null)
        val state = vm.state.value
        assertIs<VerificationFlowState.PassportDetails>(state)
        assertFalse(state.hasSavedData)
    }

    @Test
    fun loadSavedData_with_empty_data_does_nothing() {
        val vm = createViewModel()
        vm.loadSavedData(PassportData())
        val state = vm.state.value
        assertIs<VerificationFlowState.PassportDetails>(state)
        assertFalse(state.hasSavedData)
    }

    // --- proceedToMrzScan ---

    @Test
    fun proceedToMrzScan_transitions_state() {
        val vm = createViewModel()
        vm.proceedToMrzScan(validPassport)
        val state = vm.state.value
        assertIs<VerificationFlowState.MrzScan>(state)
        assertEquals(validPassport, state.passportData)
    }

    @Test
    fun proceedToMrzScan_adds_log() {
        val vm = createViewModel()
        vm.proceedToMrzScan(validPassport)
        assertTrue(vm.logs.value.any { it.contains(validPassport.passportNumber) })
    }

    // --- showMrzConfirmation ---

    @Test
    fun showMrzConfirmation_transitions_state() {
        val vm = createViewModel()
        vm.showMrzConfirmation(validPassport)
        val state = vm.state.value
        assertIs<VerificationFlowState.MrzConfirmation>(state)
        assertEquals(validPassport, state.passportData)
    }

    @Test
    fun showMrzConfirmation_adds_four_log_entries() {
        val vm = createViewModel()
        vm.showMrzConfirmation(validPassport)
        // "MRZ scan completed" + passport number + DOB + DOE = 4 log entries
        assertEquals(4, vm.logs.value.size)
    }

    // --- confirmMrzData ---

    @Test
    fun confirmMrzData_transitions_to_NfcScan() {
        val vm = createViewModel()
        vm.showMrzConfirmation(validPassport)
        vm.confirmMrzData()
        val state = vm.state.value
        assertIs<VerificationFlowState.NfcScan>(state)
        assertEquals(validPassport, state.passportData)
    }

    @Test
    fun confirmMrzData_noop_from_wrong_state() {
        val vm = createViewModel()
        // Start from PassportDetails (not MrzConfirmation)
        vm.confirmMrzData()
        assertIs<VerificationFlowState.PassportDetails>(vm.state.value)
    }

    @Test
    fun confirmMrzData_preserves_passport_data() {
        val vm = createViewModel()
        vm.showMrzConfirmation(validPassport)
        vm.confirmMrzData()
        val state = vm.state.value
        assertIs<VerificationFlowState.NfcScan>(state)
        assertEquals("L898902C3", state.passportData.passportNumber)
        assertEquals("690806", state.passportData.dateOfBirth)
        assertEquals("060815", state.passportData.dateOfExpiry)
    }

    // --- skipMrzScan ---

    @Test
    fun skipMrzScan_transitions_to_NfcScan() {
        val vm = createViewModel()
        vm.skipMrzScan(validPassport)
        val state = vm.state.value
        assertIs<VerificationFlowState.NfcScan>(state)
        assertEquals(validPassport, state.passportData)
    }

    // --- updateNfcProgress ---

    @Test
    fun updateNfcProgress_updates_scanning_state() {
        val vm = createViewModel()
        vm.skipMrzScan(validPassport)
        vm.updateNfcProgress("Reading passport data...")
        val state = vm.state.value
        assertIs<VerificationFlowState.NfcScan>(state)
        assertTrue(state.isScanning)
        assertEquals("Reading passport data...", state.progress)
    }

    @Test
    fun updateNfcProgress_noop_from_wrong_state() {
        val vm = createViewModel()
        // State is PassportDetails, not NfcScan
        vm.updateNfcProgress("progress")
        assertIs<VerificationFlowState.PassportDetails>(vm.state.value)
    }

    // --- setNfcResult ---

    @Test
    fun setNfcResult_with_data_is_success() {
        val vm = createViewModel()
        vm.skipMrzScan(validPassport)
        val jsonResult = JsonPrimitive("passport-data")
        vm.setNfcResult(jsonResult)
        val state = vm.state.value
        assertIs<VerificationFlowState.Result>(state)
        assertTrue(state.success)
        assertEquals(jsonResult, state.jsonResult)
        assertNull(state.errorMessage)
    }

    @Test
    fun setNfcResult_with_null_is_failure() {
        val vm = createViewModel()
        vm.skipMrzScan(validPassport)
        vm.setNfcResult(null)
        val state = vm.state.value
        assertIs<VerificationFlowState.Result>(state)
        assertFalse(state.success)
        assertNull(state.jsonResult)
        assertTrue(state.errorMessage?.isNotBlank() == true)
    }

    @Test
    fun setNfcResult_includes_accumulated_logs() {
        val vm = createViewModel()
        vm.addLog("log 1")
        vm.addLog("log 2")
        vm.skipMrzScan(validPassport)
        vm.setNfcResult(JsonPrimitive("data"))
        val state = vm.state.value
        assertIs<VerificationFlowState.Result>(state)
        assertTrue(state.logs.size >= 2)
    }

    // --- setError ---

    @Test
    fun setError_transitions_to_error() {
        val vm = createViewModel()
        vm.setError("Something went wrong")
        val state = vm.state.value
        assertIs<VerificationFlowState.Error>(state)
        assertEquals("Something went wrong", state.message)
    }

    @Test
    fun setError_preserves_previous_state() {
        val vm = createViewModel()
        vm.skipMrzScan(validPassport)
        vm.setError("NFC failed")
        val state = vm.state.value
        assertIs<VerificationFlowState.Error>(state)
        // The previous state should be captured (note: it captures the Error's own
        // state update moment, so previousState references the state at the time
        // setError was called — which is the Error state itself since _state.value
        // is read after the error log is added but before the state is updated to Error)
        // Actually looking at the code: previousState = _state.value which is NfcScan
        // because the state hasn't been updated to Error yet at that point
        assertIs<VerificationFlowState.NfcScan>(state.previousState)
    }

    // --- reset ---

    @Test
    fun reset_returns_to_initial_state() {
        val vm = createViewModel()
        vm.skipMrzScan(validPassport)
        vm.updateNfcProgress("reading...")
        vm.reset()
        val state = vm.state.value
        assertIs<VerificationFlowState.PassportDetails>(state)
        assertEquals(PassportData(), state.passportData)
    }

    @Test
    fun reset_clears_logs() {
        val vm = createViewModel()
        vm.addLog("log 1")
        vm.addLog("log 2")
        vm.reset()
        assertTrue(vm.logs.value.isEmpty())
    }

    // --- backToPassportDetails ---

    @Test
    fun backToPassportDetails_with_data() {
        val vm = createViewModel()
        vm.skipMrzScan(validPassport)
        vm.backToPassportDetails(validPassport)
        val state = vm.state.value
        assertIs<VerificationFlowState.PassportDetails>(state)
        assertTrue(state.hasSavedData)
        assertEquals(validPassport, state.passportData)
    }

    @Test
    fun backToPassportDetails_with_empty_data() {
        val vm = createViewModel()
        vm.backToPassportDetails(PassportData())
        val state = vm.state.value
        assertIs<VerificationFlowState.PassportDetails>(state)
        assertFalse(state.hasSavedData)
    }

    // --- Logging ---

    @Test
    fun addLog_appends() {
        val vm = createViewModel()
        vm.addLog("first log")
        assertEquals(1, vm.logs.value.size)
        assertEquals("first log", vm.logs.value[0])
    }

    @Test
    fun multiple_addLog_accumulate() {
        val vm = createViewModel()
        vm.addLog("log A")
        vm.addLog("log B")
        vm.addLog("log C")
        assertEquals(3, vm.logs.value.size)
        assertEquals("log A", vm.logs.value[0])
        assertEquals("log B", vm.logs.value[1])
        assertEquals("log C", vm.logs.value[2])
    }

    // --- End-to-end ---

    @Test
    fun full_happy_path_flow() {
        val vm = createViewModel()

        // Start at PassportDetails
        assertIs<VerificationFlowState.PassportDetails>(vm.state.value)

        // Proceed to MRZ scan
        vm.proceedToMrzScan(validPassport)
        assertIs<VerificationFlowState.MrzScan>(vm.state.value)

        // Show MRZ confirmation
        vm.showMrzConfirmation(validPassport)
        assertIs<VerificationFlowState.MrzConfirmation>(vm.state.value)

        // Confirm MRZ data → NFC scan
        vm.confirmMrzData()
        assertIs<VerificationFlowState.NfcScan>(vm.state.value)

        // Complete NFC scan → Result
        val result = JsonPrimitive("passport-verified")
        vm.setNfcResult(result)
        val finalState = vm.state.value
        assertIs<VerificationFlowState.Result>(finalState)
        assertTrue(finalState.success)
        assertEquals(result, finalState.jsonResult)
        assertTrue(finalState.logs.isNotEmpty())
    }
}
