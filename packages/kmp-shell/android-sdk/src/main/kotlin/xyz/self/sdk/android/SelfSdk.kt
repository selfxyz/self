// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.android

import android.app.Activity
import android.content.Context
import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.fragment.app.FragmentActivity
import xyz.self.sdk.bridge.*

/**
 * Main entry point for the Self SDK.
 *
 * Host apps (MiniPay, etc.) use this class to:
 * 1. Configure the SDK with their app ID and settings
 * 2. Launch the verification flow
 * 3. Receive verification results via callback
 *
 * Usage:
 * ```kotlin
 * val selfSdk = SelfSdk.configure {
 *     appId = "your-app-id"
 *     environment = SelfSdkEnvironment.PRODUCTION
 * }
 *
 * selfSdk.launch(
 *     activity = this,
 *     request = VerificationRequest(scope = "identity", userId = "user-123"),
 *     callback = object : SelfSdkCallback {
 *         override fun onVerificationComplete(result: VerificationResult) { ... }
 *         override fun onVerificationFailed(error: SelfSdkError) { ... }
 *         override fun onDismissed() { ... }
 *     }
 * )
 * ```
 */
class SelfSdk private constructor(
    private val config: SelfSdkConfig,
) {
    companion object {
        /**
         * Configure and create a SelfSdk instance.
         */
        fun configure(block: SelfSdkConfig.Builder.() -> Unit): SelfSdk {
            val builder = SelfSdkConfig.Builder()
            block(builder)
            return SelfSdk(builder.build())
        }
    }

    /**
     * Launch the Self verification flow.
     *
     * This opens a new Activity with a WebView that runs the full
     * verification experience. Results are delivered via the callback.
     */
    fun launch(
        activity: FragmentActivity,
        request: VerificationRequest,
        callback: SelfSdkCallback,
    ) {
        // Store callback for result delivery
        SelfSdkCallbackHolder.callback = callback
        SelfSdkCallbackHolder.config = config
        SelfSdkCallbackHolder.request = request

        val intent = SelfVerificationActivity.createIntent(
            context = activity,
            config = config,
            request = request,
        )
        activity.startActivity(intent)
    }
}

/**
 * SDK configuration.
 */
data class SelfSdkConfig(
    val appId: String,
    val environment: SelfSdkEnvironment,
    val theme: SelfSdkTheme,
    val features: Map<String, Boolean>,
    val locale: String?,
    val devMode: Boolean,
    val devServerUrl: String?,
) {
    class Builder {
        var appId: String = ""
        var environment: SelfSdkEnvironment = SelfSdkEnvironment.PRODUCTION
        var theme: SelfSdkTheme = SelfSdkTheme()
        var features: Map<String, Boolean> = emptyMap()
        var locale: String? = null
        var devMode: Boolean = false
        var devServerUrl: String? = null

        fun build(): SelfSdkConfig {
            require(appId.isNotBlank()) { "appId must not be blank" }
            return SelfSdkConfig(
                appId = appId,
                environment = environment,
                theme = theme,
                features = features,
                locale = locale,
                devMode = devMode,
                devServerUrl = devServerUrl,
            )
        }
    }
}

/** SDK environment. */
enum class SelfSdkEnvironment {
    PRODUCTION,
    STAGING,
    DEVELOPMENT,
}

/** Theme customization. */
data class SelfSdkTheme(
    val primaryColor: String = "#000000",
    val backgroundColor: String = "#FFFFFF",
    val accentColor: String = "#FFFBEB",
)

/** Verification request parameters. */
data class VerificationRequest(
    val scope: String,
    val userId: String? = null,
    val callbackUrl: String? = null,
    val metadata: Map<String, String> = emptyMap(),
)

/** Result of a successful verification. */
data class VerificationResult(
    val userId: String?,
    val verificationId: String?,
    val proof: Any?,
    val claims: Map<String, Any?>,
)

/** SDK error. */
data class SelfSdkError(
    val code: String,
    val message: String,
)

/** Callback interface for host apps. */
interface SelfSdkCallback {
    fun onVerificationComplete(result: VerificationResult)
    fun onVerificationFailed(error: SelfSdkError)
    fun onDismissed()
}

/** Internal holder for callback across activity boundaries. */
internal object SelfSdkCallbackHolder {
    var callback: SelfSdkCallback? = null
    var config: SelfSdkConfig? = null
    var request: VerificationRequest? = null

    fun clear() {
        callback = null
        config = null
        request = null
    }
}
