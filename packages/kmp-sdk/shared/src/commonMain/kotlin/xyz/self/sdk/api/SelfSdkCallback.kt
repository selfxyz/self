// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import kotlinx.serialization.Serializable

@Serializable
data class VerificationResult(
    val success: Boolean,
    val type: String? = null,
    val userId: String? = null,
    val verificationId: String? = null,
    val proof: String? = null,
    val claims: Map<String, String>? = null,
)

@Serializable
data class SelfSdkError(
    val code: String,
    val message: String,
)

interface SelfSdkCallback {
    fun onSuccess(result: VerificationResult)

    fun onFailure(error: SelfSdkError)

    fun onCancelled()
}
