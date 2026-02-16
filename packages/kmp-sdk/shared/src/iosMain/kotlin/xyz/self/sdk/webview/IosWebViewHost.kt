// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import xyz.self.sdk.bridge.MessageRouter

/**
 * iOS implementation of WebView host using WKWebView.
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - cinterop with WebKit framework (WKWebView, WKWebViewConfiguration, etc.)
 * - cinterop with Foundation framework (NSBundle, NSURL, etc.)
 * - Swift/Objective-C bridge for complex iOS APIs
 *
 * The iOS implementation needs to be completed with proper cinterop configuration
 * once SDK compatibility issues are resolved. See the Android implementation for reference.
 */
class IosWebViewHost(
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
) {
    fun createWebView(): Any =
        throw NotImplementedError(
            "iOS WebView hosting not yet fully implemented. " +
                "Requires WKWebView cinterop and UIViewController integration. " +
                "cinterop configuration is disabled due to Xcode SDK compatibility issues.",
        )

    fun evaluateJs(js: String): Unit =
        throw NotImplementedError(
            "iOS WebView hosting not yet fully implemented. " +
                "Requires WKWebView cinterop.",
        )
}
