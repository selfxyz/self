// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.models

/**
 * Represents the current state/stage of NFC passport scanning with progress information
 */
enum class NfcScanState(
    val percent: Int,
    val message: String,
) {
    /** Waiting for user to hold phone near passport */
    WAITING_FOR_TAG(0, "Hold your phone near the passport"),

    /** Tag detected, establishing connection */
    CONNECTING(5, "Tag detected, connecting..."),

    /** Performing PACE or BAC authentication */
    AUTHENTICATING(15, "Authenticating with passport..."),

    /** Reading passport data (DG1) */
    READING_DATA(40, "Reading passport data..."),

    /** Reading security object data (SOD) */
    READING_SECURITY(55, "Reading security data..."),

    /** Performing chip authentication */
    AUTHENTICATING_CHIP(70, "Verifying chip authenticity..."),

    /** Building and processing the final result */
    FINALIZING(90, "Processing passport data..."),

    /** Scan completed successfully */
    COMPLETE(100, "Scan complete!"),
}
