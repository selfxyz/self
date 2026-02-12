// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.nfc

import kotlinx.serialization.Serializable

/**
 * Result of a passport NFC scan. Contains all the data groups and
 * cryptographic material extracted from the chip.
 *
 * This structure mirrors the PassportData type on the TypeScript side.
 */
@Serializable
data class PassportScanResult(
    /** Machine-readable zone text from DG1. */
    val mrz: String,
    /** Document signing certificate in PEM format. */
    val dsc: String,
    /** Hash of Data Group 1 from the SOD. */
    val dg1Hash: List<Int>,
    /** Hash of Data Group 2 from the SOD. */
    val dg2Hash: List<Int>,
    /** Data groups present on the chip. */
    val dgPresents: List<Int>,
    /** Signed attributes (encapsulated content). */
    val eContent: List<Int>,
    /** Signed attributes from SOD. */
    val signedAttr: List<Int>,
    /** Encrypted digest (signature). */
    val encryptedDigest: List<Int>,
    /** Document type: "passport" or "id_card". */
    val documentType: String,
    /** Document category (same as documentType for now). */
    val documentCategory: String,
    /** Whether the data has been parsed. */
    val parsed: Boolean = false,
    /** Whether this is mock data. */
    val mock: Boolean = false,
)

/**
 * Progress update during NFC scanning.
 *
 * Emitted as bridge events to show scanning progress in the WebView UI.
 */
@Serializable
data class NfcScanProgress(
    /** Current step identifier (e.g. "bac", "reading_dg1", "chip_auth"). */
    val step: String,
    /** Progress percentage (0-100). */
    val percent: Int,
    /** Optional human-readable message. */
    val message: String? = null,
)

/**
 * Parameters for initiating an NFC scan, received from the WebView.
 */
@Serializable
data class NfcScanParams(
    val passportNumber: String,
    val dateOfBirth: String,
    val dateOfExpiry: String,
    val canNumber: String? = null,
    val skipPACE: Boolean = false,
    val skipCA: Boolean = false,
    val extendedMode: Boolean = false,
    val usePacePolling: Boolean = false,
    val sessionId: String,
    val useCan: Boolean = false,
    val userId: String? = null,
)
