// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.models

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import xyz.self.sdk.api.SelfSdkConfig
import xyz.self.sdk.api.VerificationRequest
import xyz.self.sdk.api.VerificationResult
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull

class ModelSerializationTest {
    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun passportScanResult_roundtrip_all_fields() {
        val result =
            PassportScanResult(
                documentType = "P",
                issuingState = "UTO",
                surname = "ERIKSSON",
                givenNames = "ANNA MARIA",
                documentNumber = "L898902C3",
                nationality = "UTO",
                dateOfBirth = "690806",
                gender = "F",
                dateOfExpiry = "060815",
                personalNumber = "12345678",
                mrz = "P<UTOERIKSSON<<ANNA<MARIA...",
                sodSignature = "base64sig",
                sodSignedAttributes = "base64attrs",
                sodEncapsulatedContent = "base64content",
                dg1 = "base64dg1",
                dg2 = "base64dg2",
                certificates = listOf("cert1", "cert2"),
                chipAuthSucceeded = true,
                paceSucceeded = true,
            )
        val encoded = json.encodeToString(result)
        val decoded = json.decodeFromString<PassportScanResult>(encoded)
        assertEquals(result, decoded)
    }

    @Test
    fun passportScanResult_roundtrip_minimal() {
        val result = PassportScanResult()
        val encoded = json.encodeToString(result)
        val decoded = json.decodeFromString<PassportScanResult>(encoded)
        assertNull(decoded.documentType)
        assertNull(decoded.surname)
        assertNull(decoded.certificates)
        assertFalse(decoded.chipAuthSucceeded)
        assertFalse(decoded.paceSucceeded)
    }

    @Test
    fun nfcScanParams_roundtrip() {
        val params =
            NfcScanParams(
                passportNumber = "L898902C3",
                dateOfBirth = "690806",
                dateOfExpiry = "060815",
                canNumber = "123456",
                skipPACE = true,
                skipCA = false,
                extendedMode = true,
                usePacePolling = false,
                sessionId = "session-1",
                useCan = true,
                userId = "user-42",
            )
        val encoded = json.encodeToString(params)
        val decoded = json.decodeFromString<NfcScanParams>(encoded)
        assertEquals(params, decoded)
    }

    @Test
    fun nfcScanParams_defaults() {
        val params =
            NfcScanParams(
                passportNumber = "AB123",
                dateOfBirth = "900101",
                dateOfExpiry = "300101",
                sessionId = "s1",
            )
        assertNull(params.canNumber)
        assertNull(params.skipPACE)
        assertNull(params.skipCA)
        assertNull(params.extendedMode)
        assertNull(params.usePacePolling)
        assertNull(params.useCan)
        assertNull(params.userId)
    }

    @Test
    fun nfcScanProgress_roundtrip() {
        val progress =
            NfcScanProgress(
                step = "reading_dg1",
                percent = 40,
                message = "Reading passport data...",
            )
        val encoded = json.encodeToString(progress)
        val decoded = json.decodeFromString<NfcScanProgress>(encoded)
        assertEquals(progress, decoded)
    }

    @Test
    fun verificationRequest_roundtrip() {
        val request =
            VerificationRequest(
                userId = "user-1",
                scope = "identity",
                disclosures = listOf("name", "nationality", "date_of_birth"),
            )
        val encoded = json.encodeToString(request)
        val decoded = json.decodeFromString<VerificationRequest>(encoded)
        assertEquals(request, decoded)
    }

    @Test
    fun verificationResult_roundtrip() {
        val result =
            VerificationResult(
                success = true,
                type = "proofGenerated",
                userId = "user-1",
                verificationId = "verification-123",
                proof = "proof-bytes",
                claims = mapOf("nationality" to "UTO"),
            )
        val encoded = json.encodeToString(result)
        val decoded = json.decodeFromString<VerificationResult>(encoded)
        assertEquals(result, decoded)
    }

    @Test
    fun selfSdkConfig_defaults() {
        val config = SelfSdkConfig()
        assertEquals("https://api.self.xyz", config.endpoint)
        assertFalse(config.debug)

        val encoded = json.encodeToString(config)
        val decoded = json.decodeFromString<SelfSdkConfig>(encoded)
        assertEquals(config, decoded)
    }
}
