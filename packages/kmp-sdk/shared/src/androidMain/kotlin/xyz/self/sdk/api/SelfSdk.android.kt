// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import android.content.ActivityNotFoundException
import android.content.Intent
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import kotlinx.serialization.json.Json
import xyz.self.sdk.webview.SelfVerificationActivity
import java.lang.ref.WeakReference

/**
 * Android implementation of the Self SDK.
 * Uses Activity result API to launch SelfVerificationActivity and receive results.
 */
actual class SelfSdk private constructor(
    private val config: SelfSdkConfig,
) {
    private var activityLauncher: ActivityResultLauncher<Intent>? = null
    private var launcherOwner: WeakReference<ComponentActivity>? = null
    private var boundActivity: WeakReference<ComponentActivity>? = null
    private var pendingCallback: SelfSdkCallback? = null

    actual companion object {
        private var instance: SelfSdk? = null
        private var currentActivity: WeakReference<ComponentActivity>? = null

        /**
         * Configures and returns a singleton SelfSdk instance.
         */
        actual fun configure(config: SelfSdkConfig): SelfSdk {
            if (instance == null) {
                instance = SelfSdk(config)
            }
            val activity = currentActivity?.get()
            if (activity != null) {
                instance?.bindActivity(activity)
            }
            return instance!!
        }

        /**
         * Binds the currently active host Activity so common launch(request, callback)
         * can work without Android-specific overloads.
         */
        fun bindActivity(activity: ComponentActivity) {
            currentActivity = WeakReference(activity)
            instance?.bindActivity(activity)
        }
    }

    /**
     * Launches the verification flow through the common API surface.
     * On Android, this requires a bound ComponentActivity via SelfSdk.bindActivity(activity).
     */
    actual fun launch(
        request: VerificationRequest,
        callback: SelfSdkCallback,
    ) {
        val activity =
            resolveActivity()
                ?: run {
                    callback.onFailure(
                        SelfSdkError(
                            code = "MISSING_ACTIVITY",
                            message =
                                "No bound ComponentActivity found. " +
                                    "Call SelfSdk.bindActivity(activity) in your Activity before launch().",
                        ),
                    )
                    return
                }
        launchInternal(activity, request, callback)
    }

    /**
     * Android-specific launch method that takes an Activity parameter.
     * This is the recommended way to launch the verification flow on Android.
     *
     * @param activity The ComponentActivity from which to launch verification
     * @param request Verification request parameters
     * @param callback Callback to receive results
     */
    fun launch(
        activity: ComponentActivity,
        request: VerificationRequest,
        callback: SelfSdkCallback,
    ) {
        bindActivity(activity)
        Companion.currentActivity = WeakReference(activity)
        launchInternal(activity, request, callback)
    }

    private fun launchInternal(
        activity: ComponentActivity,
        request: VerificationRequest,
        callback: SelfSdkCallback,
    ) {
        if (pendingCallback != null) {
            callback.onFailure(
                SelfSdkError(
                    code = "VERIFICATION_IN_PROGRESS",
                    message = "A verification flow is already in progress",
                ),
            )
            return
        }

        pendingCallback = callback

        // Create intent for SelfVerificationActivity
        val intent =
            Intent(activity, SelfVerificationActivity::class.java).apply {
                putExtra(SelfVerificationActivity.EXTRA_DEBUG_MODE, config.debug)
                putExtra(SelfVerificationActivity.EXTRA_VERIFICATION_REQUEST, serializeRequest(request))
                putExtra(SelfVerificationActivity.EXTRA_CONFIG, serializeConfig(config))
            }

        // Launch the verification activity
        val launcher = activityLauncher
        if (launcher == null) {
            pendingCallback = null
            callback.onFailure(
                SelfSdkError(
                    code = "LAUNCHER_NOT_AVAILABLE",
                    message = "Could not initialize Android activity launcher",
                ),
            )
            return
        }
        try {
            launcher.launch(intent)
        } catch (e: ActivityNotFoundException) {
            pendingCallback = null
            callback.onFailure(
                SelfSdkError(
                    code = "ACTIVITY_NOT_FOUND",
                    message = "Could not launch verification activity: ${e.message}",
                ),
            )
        } catch (e: IllegalStateException) {
            pendingCallback = null
            callback.onFailure(
                SelfSdkError(
                    code = "LAUNCH_FAILED",
                    message = "Could not launch verification activity: ${e.message}",
                ),
            )
        }
    }

    private fun bindActivity(activity: ComponentActivity) {
        boundActivity = WeakReference(activity)
        ensureLauncher(activity)
    }

    private fun resolveActivity(): ComponentActivity? {
        val resolved = boundActivity?.get() ?: Companion.currentActivity?.get()
        if (resolved != null) {
            bindActivity(resolved)
        }
        return resolved
    }

    private fun ensureLauncher(activity: ComponentActivity) {
        val currentOwner = launcherOwner?.get()
        if (activityLauncher != null && currentOwner === activity) {
            return
        }

        activityLauncher?.unregister()
        launcherOwner = WeakReference(activity)
        activityLauncher =
            activity.activityResultRegistry.register(
                "self-sdk-verification",
                ActivityResultContracts.StartActivityForResult(),
            ) { result ->
                val callback = pendingCallback
                pendingCallback = null
                if (callback != null) {
                    handleActivityResult(result.resultCode, result.data, callback)
                }
            }
    }

    /**
     * Handles the result from SelfVerificationActivity.
     */
    private fun handleActivityResult(
        resultCode: Int,
        data: Intent?,
        callback: SelfSdkCallback,
    ) {
        when (resultCode) {
            SelfVerificationActivity.RESULT_CODE_SUCCESS -> {
                val resultDataJson = data?.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_DATA)
                val resultType = data?.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_TYPE)
                if (resultDataJson != null) {
                    try {
                        val result = deserializeResult(resultDataJson)
                        callback.onSuccess(result)
                    } catch (e: Exception) {
                        callback.onFailure(
                            SelfSdkError(
                                code = "PARSE_ERROR",
                                message = "Failed to parse verification result: ${e.message}",
                            ),
                        )
                    }
                } else if (resultType != null) {
                    callback.onSuccess(
                        VerificationResult(success = true, type = resultType),
                    )
                } else {
                    callback.onFailure(
                        SelfSdkError(
                            code = "MISSING_RESULT",
                            message = "Verification completed but no result data was provided",
                        ),
                    )
                }
            }
            SelfVerificationActivity.RESULT_CODE_CANCELLED -> {
                // User cancelled
                callback.onCancelled()
            }
            SelfVerificationActivity.RESULT_CODE_ERROR -> {
                // Error occurred
                val errorCode = data?.getStringExtra(SelfVerificationActivity.EXTRA_ERROR_CODE) ?: "UNKNOWN_ERROR"
                val errorMessage = data?.getStringExtra(SelfVerificationActivity.EXTRA_ERROR_MESSAGE) ?: "An unknown error occurred"
                callback.onFailure(
                    SelfSdkError(code = errorCode, message = errorMessage),
                )
            }
            else -> {
                // Unexpected result code
                callback.onFailure(
                    SelfSdkError(
                        code = "UNEXPECTED_RESULT",
                        message = "Unexpected result code: $resultCode",
                    ),
                )
            }
        }
    }

    /**
     * Serializes VerificationRequest to JSON string for passing via Intent.
     */
    private fun serializeRequest(request: VerificationRequest): String = Json.encodeToString(VerificationRequest.serializer(), request)

    /**
     * Serializes SelfSdkConfig to JSON string for passing via Intent.
     */
    private fun serializeConfig(config: SelfSdkConfig): String = Json.encodeToString(SelfSdkConfig.serializer(), config)

    /**
     * Deserializes VerificationResult from JSON string.
     */
    private fun deserializeResult(json: String): VerificationResult = Json.decodeFromString(VerificationResult.serializer(), json)
}

/**
 * Extension function to make SDK usage more ergonomic on Android.
 * Allows calling SelfSdk.launch() directly with an Activity parameter.
 */
fun SelfSdk.Companion.launch(
    activity: ComponentActivity,
    config: SelfSdkConfig,
    request: VerificationRequest,
    callback: SelfSdkCallback,
) {
    val sdk = configure(config)
    sdk.launch(activity, request, callback)
}
