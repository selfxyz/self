package xyz.self.sdk.api

/**
 * JVM stub implementation of SelfSdk.
 * This is only for unit testing purposes - the SDK is not meant to run on desktop JVM.
 */
actual class SelfSdk private constructor(
    private val config: SelfSdkConfig,
) {
    actual companion object {
        actual fun configure(config: SelfSdkConfig): SelfSdk = SelfSdk(config)
    }

    actual fun launch(
        request: VerificationRequest,
        callback: SelfSdkCallback,
    ): Unit =
        throw UnsupportedOperationException(
            "SelfSdk.launch() is not supported on JVM. " +
                "This SDK only runs on Android and iOS platforms.",
        )
}
