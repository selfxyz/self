package xyz.self.sdk.api

import android.app.Activity
import android.content.Context
import android.content.Intent
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.FragmentActivity
import kotlinx.serialization.json.Json
import xyz.self.sdk.webview.SelfVerificationActivity

/**
 * Android implementation of the Self SDK.
 * Uses Activity result API to launch SelfVerificationActivity and receive results.
 */
actual class SelfSdk private constructor(private val config: SelfSdkConfig) {

    private var activityLauncher: ActivityResultLauncher<Intent>? = null
    private var pendingCallback: SelfSdkCallback? = null

    actual companion object {
        private var instance: SelfSdk? = null

        /**
         * Configures and returns a singleton SelfSdk instance.
         */
        actual fun configure(config: SelfSdkConfig): SelfSdk {
            if (instance == null) {
                instance = SelfSdk(config)
            }
            return instance!!
        }
    }

    /**
     * Launches the verification flow.
     * The calling Activity must be a FragmentActivity for result handling.
     *
     * Note: For production use, the host app should register the ActivityResultLauncher
     * in onCreate() and pass it to this method, rather than registering it here.
     * This implementation is simplified for the initial version.
     */
    actual fun launch(request: VerificationRequest, callback: SelfSdkCallback) {
        // Store callback for later
        pendingCallback = callback

        // Get current activity context
        // Note: In production, the host app should pass the activity explicitly
        // For now, we'll require the activity to be passed via a helper method
        throw NotImplementedError(
            "Please use launch(activity, request, callback) instead. " +
            "The Activity parameter is required on Android."
        )
    }

    /**
     * Android-specific launch method that takes an Activity parameter.
     * This is the recommended way to launch the verification flow on Android.
     *
     * @param activity The FragmentActivity from which to launch verification
     * @param request Verification request parameters
     * @param callback Callback to receive results
     */
    fun launch(activity: FragmentActivity, request: VerificationRequest, callback: SelfSdkCallback) {
        // Create intent for SelfVerificationActivity
        val intent = Intent(activity, SelfVerificationActivity::class.java).apply {
            putExtra(SelfVerificationActivity.EXTRA_DEBUG_MODE, config.debug)
            putExtra(SelfVerificationActivity.EXTRA_VERIFICATION_REQUEST, serializeRequest(request))
            putExtra(SelfVerificationActivity.EXTRA_CONFIG, serializeConfig(config))
        }

        // Register for activity result if not already registered
        if (activityLauncher == null) {
            activityLauncher = activity.registerForActivityResult(
                ActivityResultContracts.StartActivityForResult()
            ) { result ->
                handleActivityResult(result.resultCode, result.data, callback)
            }
        }

        // Launch the verification activity
        activityLauncher?.launch(intent)
    }

    /**
     * Handles the result from SelfVerificationActivity.
     */
    private fun handleActivityResult(resultCode: Int, data: Intent?, callback: SelfSdkCallback) {
        when (resultCode) {
            Activity.RESULT_OK -> {
                // Success
                val resultDataJson = data?.getStringExtra(SelfVerificationActivity.EXTRA_RESULT_DATA)
                if (resultDataJson != null) {
                    try {
                        val result = deserializeResult(resultDataJson)
                        callback.onSuccess(result)
                    } catch (e: Exception) {
                        callback.onFailure(
                            SelfSdkError(
                                code = "PARSE_ERROR",
                                message = "Failed to parse verification result: ${e.message}"
                            )
                        )
                    }
                } else {
                    callback.onFailure(
                        SelfSdkError(
                            code = "MISSING_RESULT",
                            message = "Verification completed but no result data was provided"
                        )
                    )
                }
            }
            Activity.RESULT_CANCELED -> {
                // User cancelled
                callback.onCancelled()
            }
            SelfVerificationActivity.RESULT_CODE_ERROR -> {
                // Error occurred
                val errorCode = data?.getStringExtra(SelfVerificationActivity.EXTRA_ERROR_CODE) ?: "UNKNOWN_ERROR"
                val errorMessage = data?.getStringExtra(SelfVerificationActivity.EXTRA_ERROR_MESSAGE) ?: "An unknown error occurred"
                callback.onFailure(
                    SelfSdkError(code = errorCode, message = errorMessage)
                )
            }
            else -> {
                // Unexpected result code
                callback.onFailure(
                    SelfSdkError(
                        code = "UNEXPECTED_RESULT",
                        message = "Unexpected result code: $resultCode"
                    )
                )
            }
        }
    }

    /**
     * Serializes VerificationRequest to JSON string for passing via Intent.
     */
    private fun serializeRequest(request: VerificationRequest): String {
        return Json.encodeToString(VerificationRequest.serializer(), request)
    }

    /**
     * Serializes SelfSdkConfig to JSON string for passing via Intent.
     */
    private fun serializeConfig(config: SelfSdkConfig): String {
        return Json.encodeToString(SelfSdkConfig.serializer(), config)
    }

    /**
     * Deserializes VerificationResult from JSON string.
     */
    private fun deserializeResult(json: String): VerificationResult {
        return Json.decodeFromString(VerificationResult.serializer(), json)
    }
}

/**
 * Extension function to make SDK usage more ergonomic on Android.
 * Allows calling SelfSdk.launch() directly with an Activity parameter.
 */
fun SelfSdk.Companion.launch(
    activity: FragmentActivity,
    config: SelfSdkConfig,
    request: VerificationRequest,
    callback: SelfSdkCallback
) {
    val sdk = configure(config)
    sdk.launch(activity, request, callback)
}
