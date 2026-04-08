// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.coroutines.runBlocking
import platform.UIKit.UIApplication
import platform.UIKit.UIModalPresentationFullScreen
import platform.UIKit.UIViewController
import platform.UIKit.UIWindow
import platform.UIKit.UIWindowScene
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.handlers.CryptoBridgeHandler
import xyz.self.sdk.handlers.LifecycleBridgeHandler
import xyz.self.sdk.handlers.SecureStorageBridgeHandler
import xyz.self.sdk.providers.IosProviderRegistry
import xyz.self.sdk.providers.SdkProviderRegistry
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
        private var configuredWith: SelfSdkConfig? = null

        actual fun configure(config: SelfSdkConfig): SelfSdk {
            if (instance == null || configuredWith != config) {
                instance = SelfSdk(config)
                configuredWith = config
            }
            return instance!!
        }
    }

    actual fun launch(
        request: VerificationRequest,
        callback: SelfSdkCallback,
    ) {
        check(SdkProviderRegistry.isConfigured() && IosProviderRegistry.webView != null) {
            "SDK providers not configured. " +
                "Call SelfSdkSwift.configure() from your iOS app before launching the SDK. " +
                "Required: secureStorage, crypto, and webView providers."
        }

        // Store callback for later
        pendingCallback = callback

        // Create router with callback to send JS to WebView
        router =
            MessageRouter(
                sendToWebView = { js ->
                    webViewHost?.evaluateJs(js)
                },
            )

        // Create lifecycle handler with callback and dismiss wiring
        val lifecycleHandler = LifecycleBridgeHandler()
        var dismissViewController: UIViewController? = null
        runBlocking {
            lifecycleHandler.configure(
                callback = callback,
                dismiss = {
                    dispatch_async(dispatch_get_main_queue()) {
                        val viewController = dismissViewController
                        if (viewController == null) {
                            pendingCallback = null
                            return@dispatch_async
                        }

                        viewController.dismissViewControllerAnimated(true) {
                            pendingCallback = null
                        }
                    }
                },
            )
        }

        // Register 3-domain bridge handlers
        registerHandlers(router!!, lifecycleHandler)

        // Build query params from config + request
        val queryParams = buildQueryParams(request)

        // Create WebView host and the web view
        webViewHost =
            IosWebViewHost(
                router!!,
                config.debug,
                remoteWebAppBaseUrl = config.remoteWebAppBaseUrl,
                devServerUrl = config.devServerUrl,
            )
        webViewHost!!.createWebView(queryParams)

        // Get the ViewController from the WebView provider and present it
        val sdkVC =
            (
                IosProviderRegistry.webView
                    ?: throw IllegalStateException("WebView provider not configured. Call SelfSdkSwift.configure() first.")
            ).getViewController()
        sdkVC.setModalPresentationStyle(UIModalPresentationFullScreen)
        dismissViewController = sdkVC

        val topVC = findTopViewController()
        if (topVC == null) {
            callback.onFailure(
                SelfSdkError(
                    code = "NO_VIEW_CONTROLLER",
                    message = "Could not find a top view controller to present the SDK UI.",
                ),
            )
            return
        }
        topVC.presentViewController(sdkVC, animated = true, completion = null)
    }

    private fun findTopViewController(): UIViewController? {
        val scenes = UIApplication.sharedApplication.connectedScenes
        for (scene in scenes) {
            val windowScene = scene as? UIWindowScene ?: continue
            val keyWindow = windowScene.windows.firstOrNull { (it as? UIWindow)?.isKeyWindow() == true } as? UIWindow
            if (keyWindow != null) {
                var topVC = keyWindow.rootViewController
                while (topVC?.presentedViewController != null) {
                    topVC = topVC?.presentedViewController
                }
                return topVC
            }
        }
        return null
    }

    private fun registerHandlers(
        router: MessageRouter,
        lifecycleHandler: LifecycleBridgeHandler,
    ) {
        router.register(SecureStorageBridgeHandler())
        router.register(CryptoBridgeHandler())
        router.register(lifecycleHandler)
    }

    private fun buildQueryParams(request: VerificationRequest): String? {
        val parts = mutableListOf<String>()

        // Config params (always present)
        parts.add("endpoint=${encodeParam(config.endpoint)}")
        parts.add("appEndpoint=${encodeParam(config.appEndpoint ?: config.endpoint)}")
        parts.add("environment=${encodeParam(config.environment.queryValue)}")
        parts.add("version=${config.version}")

        // Optional config params
        config.appName?.let { parts.add("appName=${encodeParam(it)}") }
        config.endpointType?.let { parts.add("endpointType=${encodeParam(it)}") }
        config.chainID?.let { parts.add("chainID=$it") }

        // Request params
        request.verificationId?.let { parts.add("verificationId=${encodeParam(it)}") }
        request.userId?.let { parts.add("userId=${encodeParam(it)}") }
        request.scope?.let { parts.add("scope=${encodeParam(it)}") }
        if (request.disclosures.isNotEmpty()) {
            parts.add("disclosures=${encodeParam(request.disclosures.joinToString(","))}")
        }
        request.resultType?.let { parts.add("resultType=${encodeParam(it)}") }
        if (request.excludedCountries.isNotEmpty()) {
            parts.add("excludedCountries=${encodeParam(request.excludedCountries.joinToString(","))}")
        }
        request.userIdType?.let { parts.add("userIdType=${encodeParam(it)}") }
        request.userDefinedData?.let { parts.add("userDefinedData=${encodeParam(it)}") }
        request.selfDefinedData?.let { parts.add("selfDefinedData=${encodeParam(it)}") }

        return parts.joinToString("&").ifEmpty { null }
    }

    private fun encodeParam(value: String): String =
        value
            .replace("%", "%25")
            .replace("&", "%26")
            .replace("=", "%3D")
            .replace("+", "%2B")
            .replace(" ", "%20")
}
