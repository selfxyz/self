// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import android.app.Activity
import android.content.Intent
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.webview.SelfVerificationActivity

class LifecycleHandler(private val activity: Activity) : BridgeHandler {
    override val domain = BridgeDomain.LIFECYCLE
    private var hasResult = false

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? = when (method) {
        "ready" -> null
        "dismiss" -> dismiss()
        "setResult" -> setResult(params)
        else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown lifecycle method: $method")
    }

    private fun dismiss(): JsonElement? {
        activity.runOnUiThread {
            if (!hasResult) {
                activity.setResult(Activity.RESULT_CANCELED)
            }
            activity.finish()
        }
        return null
    }

    private fun setResult(params: Map<String, JsonElement>): JsonElement? {
        activity.runOnUiThread {
            hasResult = true
            val intent = Intent()
            val resultJson = JsonObject(params)
            intent.putExtra(SelfVerificationActivity.EXTRA_RESULT_DATA, resultJson.toString())
            val isSuccess = params["success"]?.jsonPrimitive?.booleanOrNull != false
            val resultCode = if (isSuccess) Activity.RESULT_OK else Activity.RESULT_FIRST_USER
            activity.setResult(resultCode, intent)
            activity.finish()
        }
        return null
    }
}
