// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.android

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import kotlinx.serialization.json.*
import xyz.self.sdk.bridge.*

/**
 * Activity that hosts the Self verification WebView.
 *
 * This activity is launched by [SelfSdk.launch] and manages the full
 * verification lifecycle. It registers all native bridge handlers and
 * delivers results back to the host app via [SelfSdkCallback].
 */
class SelfVerificationActivity : AppCompatActivity() {

    private var fragment: SelfWebViewFragment? = null

    companion object {
        private const val EXTRA_APP_ID = "app_id"
        private const val EXTRA_ENVIRONMENT = "environment"
        private const val EXTRA_DEV_MODE = "dev_mode"
        private const val EXTRA_DEV_URL = "dev_url"
        private const val EXTRA_SCOPE = "scope"
        private const val EXTRA_USER_ID = "user_id"

        fun createIntent(
            context: Context,
            config: SelfSdkConfig,
            request: VerificationRequest,
        ): Intent {
            return Intent(context, SelfVerificationActivity::class.java).apply {
                putExtra(EXTRA_APP_ID, config.appId)
                putExtra(EXTRA_ENVIRONMENT, config.environment.name)
                putExtra(EXTRA_DEV_MODE, config.devMode)
                config.devServerUrl?.let { putExtra(EXTRA_DEV_URL, it) }
                putExtra(EXTRA_SCOPE, request.scope)
                request.userId?.let { putExtra(EXTRA_USER_ID, it) }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (savedInstanceState == null) {
            fragment = SelfWebViewFragment.newInstance(
                devMode = intent.getBooleanExtra(EXTRA_DEV_MODE, false),
                devServerUrl = intent.getStringExtra(EXTRA_DEV_URL),
            )
            supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, fragment!!)
                .commit()
        }

        // Register bridge handlers after fragment is created
        fragment?.let { frag ->
            val router = frag.getRouter()

            // Register all native bridge handlers
            frag.registerHandler(NfcBridgeHandler(this, router))
            frag.registerHandler(BiometricBridgeHandler(this))
            frag.registerHandler(SecureStorageBridgeHandler(this))
            frag.registerHandler(CryptoBridgeHandler())
            frag.registerHandler(CameraMrzBridgeHandler(this))

            // Register lifecycle handler that delivers results
            router.register(object : BridgeHandler {
                override val domain = BridgeDomain.LIFECYCLE

                override suspend fun handle(
                    method: String,
                    params: Map<String, JsonElement>,
                ): JsonElement? {
                    when (method) {
                        "ready" -> {
                            // WebView is ready — nothing to do
                        }
                        "dismiss" -> {
                            runOnUiThread {
                                SelfSdkCallbackHolder.callback?.onDismissed()
                                SelfSdkCallbackHolder.clear()
                                finish()
                            }
                        }
                        "setResult" -> {
                            val success = params["success"]?.jsonPrimitive?.booleanOrNull ?: false
                            if (success) {
                                SelfSdkCallbackHolder.callback?.onVerificationComplete(
                                    VerificationResult(
                                        userId = params["userId"]?.jsonPrimitive?.contentOrNull,
                                        verificationId = params["verificationId"]?.jsonPrimitive?.contentOrNull,
                                        proof = params["proof"]?.toString(),
                                        claims = emptyMap(),
                                    )
                                )
                            } else {
                                val errorCode = params["error"]?.jsonObject?.get("code")?.jsonPrimitive?.contentOrNull ?: "UNKNOWN"
                                val errorMsg = params["error"]?.jsonObject?.get("message")?.jsonPrimitive?.contentOrNull ?: "Verification failed"
                                SelfSdkCallbackHolder.callback?.onVerificationFailed(
                                    SelfSdkError(code = errorCode, message = errorMsg)
                                )
                            }
                            runOnUiThread {
                                SelfSdkCallbackHolder.clear()
                                finish()
                            }
                        }
                    }
                    return buildJsonObject { put("acknowledged", true) }
                }
            })
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        if (isFinishing) {
            SelfSdkCallbackHolder.callback?.onDismissed()
            SelfSdkCallbackHolder.clear()
        }
    }
}
