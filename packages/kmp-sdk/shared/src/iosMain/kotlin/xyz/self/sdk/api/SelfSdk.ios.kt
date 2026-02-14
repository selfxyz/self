package xyz.self.sdk.api

import kotlinx.cinterop.ExperimentalForeignApi
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.handlers.AnalyticsBridgeHandler
import xyz.self.sdk.handlers.BiometricBridgeHandler
import xyz.self.sdk.handlers.CameraMrzBridgeHandler
import xyz.self.sdk.handlers.CryptoBridgeHandler
import xyz.self.sdk.handlers.DocumentsBridgeHandler
import xyz.self.sdk.handlers.HapticBridgeHandler
import xyz.self.sdk.handlers.LifecycleBridgeHandler
import xyz.self.sdk.handlers.NfcBridgeHandler
import xyz.self.sdk.handlers.SecureStorageBridgeHandler
import xyz.self.sdk.webview.IosWebViewHost

/**
 * iOS implementation of the Self SDK.
 * Uses WKWebView to present the verification UI and UIViewController for modal presentation.
 *
 * Note: This implementation provides the bridge infrastructure but requires integration
 * with UIViewController lifecycle for full functionality. Some handlers (Crypto, NFC,
 * Camera, Lifecycle) have stub implementations that need to be completed.
 */
@OptIn(ExperimentalForeignApi::class)
actual class SelfSdk private constructor(
    private val config: SelfSdkConfig,
) {
    private var webViewHost: IosWebViewHost? = null
    private var router: MessageRouter? = null
    private var pendingCallback: SelfSdkCallback? = null

    actual companion object {
        private var instance: SelfSdk? = null

        actual fun configure(config: SelfSdkConfig): SelfSdk {
            if (instance == null) {
                instance = SelfSdk(config)
            }
            return instance!!
        }
    }

    actual fun launch(
        request: VerificationRequest,
        callback: SelfSdkCallback,
    ) {
        // Store callback for later
        pendingCallback = callback

        // Create router with callback to send JS to WebView
        router =
            MessageRouter(
                sendToWebView = { js ->
                    webViewHost?.evaluateJs(js)
                },
            )

        // Register all iOS bridge handlers
        registerHandlers(router!!)

        // Create WebView host
        webViewHost = IosWebViewHost(router!!, config.debug)

        // Create the WebView
        val webView = webViewHost!!.createWebView()

        // TODO: Full implementation requires:
        // 1. Create a UIViewController to host the WKWebView
        // 2. Present it modally from the current UIViewController
        // 3. Wire up lifecycle handler to dismiss and deliver results
        //
        // For now, this creates the infrastructure but doesn't present the UI.
        // The host app needs to:
        // - Get access to the current UIViewController
        // - Create a container UIViewController with the webView
        // - Present it modally
        // - Handle dismissal and results

        throw NotImplementedError(
            "iOS UI presentation not yet fully implemented. " +
                "The WebView and handlers are configured, but UIViewController " +
                "presentation requires integration with the host app's view hierarchy. " +
                "See SelfSdk.android.kt for reference on the complete flow.",
        )
    }

    /**
     * Registers all iOS bridge handlers with the MessageRouter.
     */
    private fun registerHandlers(router: MessageRouter) {
        // Biometrics - Touch ID / Face ID
        router.register(BiometricBridgeHandler())

        // Secure Storage - Keychain
        router.register(SecureStorageBridgeHandler())

        // Crypto - Signing and key management (stub)
        router.register(CryptoBridgeHandler())

        // Haptic - Vibration feedback
        router.register(HapticBridgeHandler())

        // Analytics - Event tracking
        router.register(AnalyticsBridgeHandler())

        // Lifecycle - ViewController lifecycle (stub)
        router.register(LifecycleBridgeHandler())

        // Documents - Encrypted document storage
        router.register(DocumentsBridgeHandler())

        // Camera - MRZ scanning (stub)
        router.register(CameraMrzBridgeHandler())

        // NFC - Passport scanning (stub)
        router.register(NfcBridgeHandler(router))
    }
}
