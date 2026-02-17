// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.models

import kotlinx.serialization.Serializable

@Serializable
data class PassportScanResult(
    val documentType: String? = null,
    val issuingState: String? = null,
    val surname: String? = null,
    val givenNames: String? = null,
    val documentNumber: String? = null,
    val nationality: String? = null,
    val dateOfBirth: String? = null,
    val gender: String? = null,
    val dateOfExpiry: String? = null,
    val personalNumber: String? = null,
    val mrz: String? = null,
    val sodSignature: String? = null,
    val sodSignedAttributes: String? = null,
    val sodEncapsulatedContent: String? = null,
    val dg1: String? = null,
    val dg2: String? = null,
    val certificates: List<String>? = null,
    val chipAuthSucceeded: Boolean = false,
    val paceSucceeded: Boolean = false,
)
