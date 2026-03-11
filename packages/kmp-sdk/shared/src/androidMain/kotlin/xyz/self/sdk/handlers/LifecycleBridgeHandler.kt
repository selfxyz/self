// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import android.app.Activity
import android.content.Intent
import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.api.serializeVerificationResult
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
        activity.runOnUiThread {
            val intent = Intent()

            try {
                when (val outcome = resolveLifecycleSetResult(params)) {
                    is LifecycleSetResultOutcome.Success -> {
                        intent.putExtra(
                            SelfVerificationActivity.EXTRA_RESULT_DATA,
                            serializeVerificationResult(outcome.result),
                        )
                        activity.setResult(SelfVerificationActivity.RESULT_CODE_SUCCESS, intent)
                    }
                    is LifecycleSetResultOutcome.Failure -> {
                        intent.putExtra(SelfVerificationActivity.EXTRA_ERROR_CODE, outcome.error.code)
                        intent.putExtra(SelfVerificationActivity.EXTRA_ERROR_MESSAGE, outcome.error.message)
                        activity.setResult(SelfVerificationActivity.RESULT_CODE_ERROR, intent)
                    }
                    LifecycleSetResultOutcome.Cancelled -> {
                        activity.setResult(SelfVerificationActivity.RESULT_CODE_CANCELLED, intent)
                    }
                }
            } finally {
                activity.finish()
            }
        }

        return null
    }
}
