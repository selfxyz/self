// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.models

import kotlinx.serialization.Serializable

@Serializable
data class NfcScanParams(
    val passportNumber: String,
    val dateOfBirth: String,
    val dateOfExpiry: String,
    val canNumber: String? = null,
    val skipPACE: Boolean? = null,
    val skipCA: Boolean? = null,
    val extendedMode: Boolean? = null,
    val usePacePolling: Boolean? = null,
    val sessionId: String,
    val useCan: Boolean? = null,
    val userId: String? = null,
)
