// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.models

import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class VerificationFlowStateTest {
    @Test
    fun passport_details_defaults() {
        val state = VerificationFlowState.PassportDetails()
        assertEquals(PassportData(), state.passportData)
        assertFalse(state.hasSavedData)
    }

    @Test
    fun nfc_scan_defaults() {
        val state =
            VerificationFlowState.NfcScan(
                passportData = PassportData(passportNumber = "X", dateOfBirth = "123456", dateOfExpiry = "654321"),
            )
        assertFalse(state.isScanning)
        assertEquals("", state.progress)
    }

    @Test
    fun result_holds_success_data() {
        val jsonResult = JsonPrimitive("passport-data")
        val state =
            VerificationFlowState.Result(
                success = true,
                jsonResult = jsonResult,
            )
        assertTrue(state.success)
        assertEquals(jsonResult, state.jsonResult)
        assertNull(state.errorMessage)
    }

    @Test
    fun result_holds_failure_data() {
        val state =
            VerificationFlowState.Result(
                success = false,
                errorMessage = "NFC scan failed",
            )
        assertFalse(state.success)
        assertNull(state.jsonResult)
        assertEquals("NFC scan failed", state.errorMessage)
    }

    @Test
    fun error_references_previous_state() {
        val previousState = VerificationFlowState.PassportDetails()
        val errorState =
            VerificationFlowState.Error(
                message = "Something went wrong",
                previousState = previousState,
            )
        assertEquals("Something went wrong", errorState.message)
        assertTrue(errorState.previousState is VerificationFlowState.PassportDetails)
    }

    @Test
    fun nfc_scan_copy_preserves_passport_data() {
        val passportData =
            PassportData(
                passportNumber = "L898902C3",
                dateOfBirth = "690806",
                dateOfExpiry = "060815",
            )
        val state = VerificationFlowState.NfcScan(passportData = passportData)
        val updated = state.copy(isScanning = true, progress = "Reading...")
        assertEquals(passportData, updated.passportData)
        assertTrue(updated.isScanning)
        assertEquals("Reading...", updated.progress)
    }
}
