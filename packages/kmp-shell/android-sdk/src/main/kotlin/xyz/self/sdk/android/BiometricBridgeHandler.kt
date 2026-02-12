// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.android

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Bridge handler for biometric authentication on Android.
 *
 * Uses AndroidX Biometric library to present the system biometric prompt
 * (fingerprint, face, etc.) and returns the result to the WebView.
 *
 * @param activity The [FragmentActivity] required by [BiometricPrompt].
 */
class BiometricBridgeHandler(
    private val activity: FragmentActivity,
) : BridgeHandler {

    override val domain = BridgeDomain.BIOMETRICS

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "isAvailable" -> checkAvailability()
            "authenticate" -> authenticate(params)
            "getBiometryType" -> getBiometryType()
            else -> throw BridgeHandlerException(
                "UNKNOWN_METHOD",
                "Unknown biometrics method: $method",
            )
        }
    }

    private fun checkAvailability(): JsonElement {
        val biometricManager = BiometricManager.from(activity)
        val canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG,
        )
        return buildJsonObject {
            put("available", canAuthenticate == BiometricManager.BIOMETRIC_SUCCESS)
        }
    }

    private suspend fun authenticate(params: Map<String, JsonElement>): JsonElement {
        val reason = params["reason"]?.jsonPrimitive?.content ?: "Authenticate"

        return suspendCancellableCoroutine { cont ->
            val executor = ContextCompat.getMainExecutor(activity)

            val callback = object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    if (cont.isActive) {
                        cont.resume(buildJsonObject { put("authenticated", true) })
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    if (cont.isActive) {
                        cont.resumeWithException(
                            BridgeHandlerException("BIOMETRIC_ERROR", errString.toString())
                        )
                    }
                }

                override fun onAuthenticationFailed() {
                    // Called on each failed attempt; don't resolve yet as the user can retry.
                }
            }

            val prompt = BiometricPrompt(activity, executor, callback)

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Self Verification")
                .setSubtitle(reason)
                .setNegativeButtonText("Cancel")
                .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                .build()

            activity.runOnUiThread { prompt.authenticate(promptInfo) }

            cont.invokeOnCancellation { prompt.cancelAuthentication() }
        }
    }

    private fun getBiometryType(): JsonElement {
        val biometricManager = BiometricManager.from(activity)

        val hasStrong = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG,
        ) == BiometricManager.BIOMETRIC_SUCCESS

        val hasWeak = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_WEAK,
        ) == BiometricManager.BIOMETRIC_SUCCESS

        val type = when {
            hasStrong -> "fingerprint" // Android doesn't easily distinguish fingerprint vs face
            hasWeak -> "weak"
            else -> "none"
        }

        return buildJsonObject {
            put("type", type)
        }
    }
}
