// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import kotlinx.cinterop.ExperimentalForeignApi
import platform.UIKit.UIView
import platform.UIKit.UIViewController
import xyz.self.sdk.api.SdkConstants
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.providers.IosProviderRegistry

@OptIn(ExperimentalForeignApi::class)
class IosWebViewHost(
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
    private val remoteWebAppBaseUrl: String = SdkConstants.DEFAULT_REMOTE_WEB_APP_BASE_URL,
    private val devServerUrl: String? = null,
) {
    fun createWebView(queryParams: String? = null): UIView {
        val provider =
            IosProviderRegistry.webView
                ?: throw IllegalStateException("WebView provider not configured")

        provider.configureRemoteLoading(remoteWebAppBaseUrl)
        provider.configureDevServer(devServerUrl)

        return provider.createWebView(
            onMessageReceived = { rawJson ->
                router.onMessageReceived(
                    rawJson = rawJson,
                    isTrustedSource = provider.isBridgeRequestAllowed(),
                )
            },
            isDebugMode = isDebugMode,
            queryParams = queryParams,
        )
    }

    fun evaluateJs(js: String) {
        val provider =
            IosProviderRegistry.webView
                ?: throw IllegalStateException("WebView provider not configured")
        provider.evaluateJs(js)
    }

    fun getViewController(): UIViewController {
        val provider =
            IosProviderRegistry.webView
                ?: throw IllegalStateException("WebView provider not configured")
        return provider.getViewController()
    }
}
