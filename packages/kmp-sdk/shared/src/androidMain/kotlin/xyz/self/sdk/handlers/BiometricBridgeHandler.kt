package xyz.self.sdk.handlers

import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Android implementation of biometric authentication bridge handler.
 * Uses androidx.biometric.BiometricPrompt for fingerprint/face authentication.
 */
class BiometricBridgeHandler(
    private val activity: FragmentActivity
) : BridgeHandler {

    override val domain = BridgeDomain.BIOMETRICS

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        return when (method) {
            "authenticate" -> authenticate(params)
            "isAvailable" -> isAvailable()
            "getBiometryType" -> getBiometryType()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown biometrics method: $method"
            )
        }
    }

    /**
     * Prompts the user to authenticate using biometrics.
     * Returns true on success, throws exception on failure.
     */
    private suspend fun authenticate(params: Map<String, JsonElement>): JsonElement {
        val reason = params["reason"]?.jsonPrimitive?.content ?: "Authenticate to continue"

        return suspendCancellableCoroutine { continuation ->
            val executor = ContextCompat.getMainExecutor(activity)

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Self Verification")
                .setSubtitle(reason)
                .setNegativeButtonText("Cancel")
                .build()

            val biometricPrompt = BiometricPrompt(
                activity,
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        super.onAuthenticationSucceeded(result)
                        if (continuation.isActive) {
                            continuation.resume(JsonPrimitive(true))
                        }
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        super.onAuthenticationError(errorCode, errString)
                        if (continuation.isActive) {
                            continuation.resumeWithException(
                                BridgeHandlerException(
                                    "BIOMETRIC_ERROR",
                                    errString.toString(),
                                    mapOf("errorCode" to JsonPrimitive(errorCode))
                                )
                            )
                        }
                    }

                    override fun onAuthenticationFailed() {
                        super.onAuthenticationFailed()
                        // Don't cancel continuation here - user can retry
                        // Only cancel on error or when they press the negative button
                    }
                }
            )

            // Cancel biometric prompt if coroutine is cancelled
            continuation.invokeOnCancellation {
                biometricPrompt.cancelAuthentication()
            }

            biometricPrompt.authenticate(promptInfo)
        }
    }

    /**
     * Checks if biometric authentication is available on this device.
     * Returns true if the device has biometric hardware and enrolled biometrics.
     */
    private fun isAvailable(): JsonElement {
        val biometricManager = androidx.biometric.BiometricManager.from(activity)
        val canAuthenticate = biometricManager.canAuthenticate(
            androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
        )

        val isAvailable = canAuthenticate == androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS

        return JsonPrimitive(isAvailable)
    }

    /**
     * Returns the type of biometric authentication available.
     * Android doesn't easily distinguish between fingerprint and face,
     * so we return generic "biometric" type.
     */
    private fun getBiometryType(): JsonElement {
        val biometricManager = androidx.biometric.BiometricManager.from(activity)
        val canAuthenticate = biometricManager.canAuthenticate(
            androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
        )

        val biometryType = when (canAuthenticate) {
            androidx.biometric.BiometricManager.BIOMETRIC_SUCCESS -> "biometric"
            else -> "none"
        }

        return JsonPrimitive(biometryType)
    }
}
