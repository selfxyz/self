package xyz.self.sdk.api

/**
 * Main entry point for the Self SDK.
 * This is the public API that host applications use to launch verification flows.
 *
 * Example usage:
 * ```
 * val sdk = SelfSdk.configure(SelfSdkConfig(
 *     endpoint = "https://api.self.xyz",
 *     debug = true
 * ))
 *
 * sdk.launch(
 *     request = VerificationRequest(userId = "user123"),
 *     callback = object : SelfSdkCallback {
 *         override fun onSuccess(result: VerificationResult) {
 *             println("Verification succeeded: ${result.verificationId}")
 *         }
 *         override fun onFailure(error: SelfSdkError) {
 *             println("Verification failed: ${error.message}")
 *         }
 *         override fun onCancelled() {
 *             println("Verification cancelled by user")
 *         }
 *     }
 * )
 * ```
 */
expect class SelfSdk {
    companion object {
        /**
         * Configures and returns a SelfSdk instance.
         * This should be called once during app initialization.
         *
         * @param config SDK configuration (endpoint, debug mode, etc.)
         * @return Configured SelfSdk instance
         */
        fun configure(config: SelfSdkConfig): SelfSdk
    }

    /**
     * Launches the verification flow.
     * This will present the verification UI (WebView) to the user.
     *
     * @param request Verification request parameters (userId, scope, disclosures)
     * @param callback Callback to receive verification results
     */
    fun launch(
        request: VerificationRequest,
        callback: SelfSdkCallback,
    )
}
