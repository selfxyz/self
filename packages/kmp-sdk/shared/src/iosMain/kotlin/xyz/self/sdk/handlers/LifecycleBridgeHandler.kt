// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
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

    private val mutex = Mutex()
    internal var pendingCallback: SelfSdkCallback? = null
    internal var dismissAction: (() -> Unit)? = null

    private data class LifecycleState(
        val callback: SelfSdkCallback?,
        val dismiss: (() -> Unit)?,
    )

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

    private suspend fun consumeLifecycleState(): LifecycleState =
        mutex.withLock {
            val state =
                LifecycleState(
                    callback = pendingCallback,
                    dismiss = dismissAction,
                )
            pendingCallback = null
            dismissAction = null
            state
        }

    private suspend fun dismiss(): JsonElement? {
        val state = consumeLifecycleState()
        state.callback?.onCancelled()
        state.dismiss?.invoke()
        return null
    }

    private suspend fun setResult(params: Map<String, JsonElement>): JsonElement? {
        val state = consumeLifecycleState()
        val type = params["type"]?.jsonPrimitive?.content
        val success = params["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
        val data = params["data"]?.toString()
        val errorCode = params["errorCode"]?.jsonPrimitive?.content
        val errorMessage = params["errorMessage"]?.jsonPrimitive?.content

        if (type != null) {
            // Flat lifecycle payload (e.g. { type: "proofRequested" }) — pass type through
            state.callback?.onSuccess(
                VerificationResult(success = true, type = type),
            )
        } else if (success && data != null) {
            try {
                val result = Json.decodeFromString(VerificationResult.serializer(), data)
                state.callback?.onSuccess(result)
            } catch (e: Exception) {
                state.callback?.onFailure(
                    SelfSdkError(
                        code = "PARSE_ERROR",
                        message = "Failed to parse verification result: ${e.message}",
                    ),
                )
            }
        } else if (!success && errorCode != null) {
            state.callback?.onFailure(
                SelfSdkError(
                    code = errorCode,
                    message = errorMessage ?: "Unknown error",
                ),
            )
        } else {
            state.callback?.onCancelled()
        }

        state.dismiss?.invoke()
        return null
    }
}
