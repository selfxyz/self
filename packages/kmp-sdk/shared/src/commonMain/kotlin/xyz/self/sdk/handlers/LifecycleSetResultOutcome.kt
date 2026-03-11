// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.api.SelfSdkError
import xyz.self.sdk.api.VerificationResult
import xyz.self.sdk.api.deserializeVerificationResult
import xyz.self.sdk.api.verificationResultFromLifecycleParams

internal sealed interface LifecycleSetResultOutcome {
    data class Success(
        val result: VerificationResult,
    ) : LifecycleSetResultOutcome

    data class Failure(
        val error: SelfSdkError,
    ) : LifecycleSetResultOutcome

    data object Cancelled : LifecycleSetResultOutcome
}

internal fun resolveLifecycleSetResult(params: Map<String, JsonElement>): LifecycleSetResultOutcome {
    val type = params["type"]?.jsonPrimitive?.contentOrNull
    val successText = params["success"]?.jsonPrimitive?.contentOrNull
    val success = successText?.toBoolean()
    val data = params["data"]?.toString()
    val errorCode = params["errorCode"]?.jsonPrimitive?.contentOrNull
    val errorMessage = params["errorMessage"]?.jsonPrimitive?.contentOrNull

    if (type != null) {
        return when {
            errorCode != null ->
                LifecycleSetResultOutcome.Failure(
                    SelfSdkError(
                        code = errorCode,
                        message = errorMessage ?: "Unknown error",
                    ),
                )
            success == false -> LifecycleSetResultOutcome.Cancelled
            else -> LifecycleSetResultOutcome.Success(verificationResultFromLifecycleParams(params))
        }
    }

    return when {
        errorCode != null ->
            LifecycleSetResultOutcome.Failure(
                SelfSdkError(
                    code = errorCode,
                    message = errorMessage ?: "Unknown error",
                ),
            )
        success == true && data != null ->
            try {
                LifecycleSetResultOutcome.Success(deserializeVerificationResult(data))
            } catch (e: Exception) {
                LifecycleSetResultOutcome.Failure(
                    SelfSdkError(
                        code = "PARSE_ERROR",
                        message = "Failed to parse verification result: ${e.message}",
                    ),
                )
            }
        else -> LifecycleSetResultOutcome.Cancelled
    }
}
