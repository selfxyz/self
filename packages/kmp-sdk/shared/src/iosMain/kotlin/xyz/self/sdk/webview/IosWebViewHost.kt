// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import kotlinx.cinterop.ExperimentalForeignApi
import platform.UIKit.UIView
import platform.UIKit.UIViewController
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.providers.SdkProviderRegistry

@OptIn(ExperimentalForeignApi::class)
class IosWebViewHost(
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
) {
    fun createWebView(): UIView {
        val provider =
            SdkProviderRegistry.webView
                ?: throw IllegalStateException("WebView provider not configured")

        return provider.createWebView(
            onMessageReceived = { rawJson ->
                router.onMessageReceived(rawJson)
            },
            isDebugMode = isDebugMode,
        )
    }

    fun evaluateJs(js: String) {
        val provider =
            SdkProviderRegistry.webView
                ?: throw IllegalStateException("WebView provider not configured")
        provider.evaluateJs(js)
    }

    fun getViewController(): UIViewController {
        val provider =
            SdkProviderRegistry.webView
                ?: throw IllegalStateException("WebView provider not configured")
        return provider.getViewController()
    }
}
