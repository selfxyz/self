// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import android.app.Activity
import android.content.Intent
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.webview.SelfVerificationActivity

/**
 * Android implementation of lifecycle bridge handler.
 * Manages WebView lifecycle and communication with the host Activity.
 */
class LifecycleBridgeHandler(
    private val activity: Activity,
) : BridgeHandler {
    override val domain = BridgeDomain.LIFECYCLE

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

    /**
     * Called when the WebView has finished loading and is ready.
     * Can be used to hide loading screens or perform initialization.
     */
    private fun ready(): JsonElement? {
        // No-op for now. Host app can listen for this via events if needed.
        return null
    }

    /**
     * Dismisses the verification Activity without setting a result.
     * Equivalent to the user cancelling the flow.
     */
    private fun dismiss(): JsonElement? {
        activity.runOnUiThread {
            activity.setResult(SelfVerificationActivity.RESULT_CODE_CANCELLED)
            activity.finish()
        }
        return null
    }

    /**
     * Sets a result and finishes the Activity.
     * Used to communicate verification results back to the host app.
     */
    private fun setResult(params: Map<String, JsonElement>): JsonElement? {
        val type = params["type"]?.jsonPrimitive?.content
        val success = params["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
        val data = params["data"]?.toString()
        val errorCode = params["errorCode"]?.jsonPrimitive?.content
        val errorMessage = params["errorMessage"]?.jsonPrimitive?.content

        activity.runOnUiThread {
            val intent = Intent()

            if (type != null) {
                // Flat lifecycle payload (e.g. { type: "proofRequested" }) — treat as success
                intent.putExtra(SelfVerificationActivity.EXTRA_RESULT_TYPE, type)
                activity.setResult(SelfVerificationActivity.RESULT_CODE_SUCCESS, intent)
            } else if (success && data != null) {
                // Success result
                intent.putExtra(SelfVerificationActivity.EXTRA_RESULT_DATA, data)
                activity.setResult(SelfVerificationActivity.RESULT_CODE_SUCCESS, intent)
            } else if (!success && errorCode != null) {
                // Error result
                intent.putExtra(SelfVerificationActivity.EXTRA_ERROR_CODE, errorCode)
                intent.putExtra(SelfVerificationActivity.EXTRA_ERROR_MESSAGE, errorMessage ?: "Unknown error")
                activity.setResult(SelfVerificationActivity.RESULT_CODE_ERROR, intent)
            } else {
                // Cancelled or invalid result
                activity.setResult(SelfVerificationActivity.RESULT_CODE_CANCELLED, intent)
            }

            activity.finish()
        }

        return null
    }
}
