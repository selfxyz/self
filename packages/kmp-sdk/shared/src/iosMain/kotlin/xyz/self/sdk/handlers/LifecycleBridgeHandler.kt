// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.api.SelfSdkCallback
import xyz.self.sdk.api.SelfSdkError
import xyz.self.sdk.api.VerificationResult
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

class LifecycleBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.LIFECYCLE

    internal var pendingCallback: SelfSdkCallback? = null
    internal var dismissAction: (() -> Unit)? = null

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "ready" -> ready()
            "dismiss" -> dismiss()
            "setResult" -> setResult(params)
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown lifecycle method: $method",
            )
        }

    private fun ready(): JsonElement? = null

    private fun dismiss(): JsonElement? {
        pendingCallback?.onCancelled()
        pendingCallback = null
        dismissAction?.invoke()
        return null
    }

    private fun setResult(params: Map<String, JsonElement>): JsonElement? {
        val success = params["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
        val data = params["data"]?.toString()
        val errorCode = params["errorCode"]?.jsonPrimitive?.content
        val errorMessage = params["errorMessage"]?.jsonPrimitive?.content

        if (success && data != null) {
            try {
                val result = Json.decodeFromString(VerificationResult.serializer(), data)
                pendingCallback?.onSuccess(result)
            } catch (e: Exception) {
                pendingCallback?.onFailure(
                    SelfSdkError(
                        code = "PARSE_ERROR",
                        message = "Failed to parse verification result: ${e.message}",
                    ),
                )
            }
        } else if (!success && errorCode != null) {
            pendingCallback?.onFailure(
                SelfSdkError(
                    code = errorCode,
                    message = errorMessage ?: "Unknown error",
                ),
            )
        } else {
            pendingCallback?.onCancelled()
        }

        pendingCallback = null
        dismissAction?.invoke()
        return null
    }
}
