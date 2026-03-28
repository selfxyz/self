// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import android.app.Activity
import android.content.Intent
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.webview.SelfVerificationActivity

class LifecycleHandler(private val activity: Activity) : BridgeHandler {
    override val domain = BridgeDomain.LIFECYCLE

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
            activity.setResult(Activity.RESULT_CANCELED)
            activity.finish()
        }
        return null
    }

    private fun setResult(params: Map<String, JsonElement>): JsonElement? {
        activity.runOnUiThread {
            val intent = Intent()
            val result = params["result"]
            if (result != null) {
                intent.putExtra(SelfVerificationActivity.EXTRA_RESULT_DATA, result.toString())
                val isSuccess = result.jsonObject["success"]?.jsonPrimitive?.booleanOrNull != false
                val resultCode = if (isSuccess) Activity.RESULT_OK else Activity.RESULT_FIRST_USER
                activity.setResult(resultCode, intent)
            } else {
                activity.setResult(Activity.RESULT_CANCELED)
            }
            activity.finish()
        }
        return null
    }
}
