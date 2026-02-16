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
            activity.setResult(Activity.RESULT_CANCELED)
            activity.finish()
        }
        return null
    }

    /**
     * Sets a result and finishes the Activity.
     * Used to communicate verification results back to the host app.
     */
    private fun setResult(params: Map<String, JsonElement>): JsonElement? {
        val success = params["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
        val data = params["data"]?.toString()
        val errorCode = params["errorCode"]?.jsonPrimitive?.content
        val errorMessage = params["errorMessage"]?.jsonPrimitive?.content

        activity.runOnUiThread {
            val intent = Intent()

            if (success && data != null) {
                // Success result
                intent.putExtra("xyz.self.sdk.RESULT_DATA", data)
                activity.setResult(Activity.RESULT_OK, intent)
            } else if (!success && errorCode != null) {
                // Error result
                intent.putExtra("xyz.self.sdk.ERROR_CODE", errorCode)
                intent.putExtra("xyz.self.sdk.ERROR_MESSAGE", errorMessage ?: "Unknown error")
                activity.setResult(Activity.RESULT_FIRST_USER, intent)
            } else {
                // Cancelled or invalid result
                activity.setResult(Activity.RESULT_CANCELED, intent)
            }

            activity.finish()
        }

        return null
    }
}
