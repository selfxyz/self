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
    internal val resultGate = LifecycleResultGate()

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
            if (resultGate.tryClaim()) {
                activity.setResult(Activity.RESULT_CANCELED)
            }
            activity.finish()
        }
        return null
    }

    private fun setResult(params: Map<String, JsonElement>): JsonElement? {
        activity.runOnUiThread {
            if (!resultGate.tryClaim()) return@runOnUiThread
            val intent = Intent()
            val resultPayload = LifecycleResultEnvelope.extractPayload(params)
            intent.putExtra(SelfVerificationActivity.EXTRA_RESULT_DATA, resultPayload.toString())
            val isSuccess = LifecycleResultEnvelope.extractSuccess(resultPayload)
            val resultCode = if (isSuccess) Activity.RESULT_OK else Activity.RESULT_FIRST_USER
            activity.setResult(resultCode, intent)
            activity.finish()
        }
        return null
    }
}

internal class LifecycleResultGate {
    private var claimed = false

    fun tryClaim(): Boolean {
        if (claimed) return false
        claimed = true
        return true
    }

    val isClaimed: Boolean get() = claimed
}

internal object LifecycleResultEnvelope {
    fun extractPayload(params: Map<String, JsonElement>): JsonObject =
        when (val nestedResult = params["result"]) {
            is JsonObject -> nestedResult
            else -> JsonObject(params)
        }

    fun extractSuccess(payload: JsonObject): Boolean =
        payload["success"]?.jsonPrimitive?.booleanOrNull == true
}
