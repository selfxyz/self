// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import android.annotation.SuppressLint
import android.content.Context
import android.net.http.SslError
import android.webkit.JavascriptInterface
import android.webkit.SslErrorHandler
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import xyz.self.sdk.bridge.MessageRouter

/**
 * Manages an Android WebView instance for hosting the Self verification UI.
 * Handles bidirectional communication between WebView JavaScript and native Kotlin code.
 *
 * Uses WebViewAssetLoader to serve bundled assets under https://appassets.androidplatform.net/
 * so the WebView has a proper origin for History API, CORS, and other web platform features.
 */
class AndroidWebViewHost(
    private val context: Context,
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
) {
    private lateinit var webView: WebView

    /**
     * Creates and configures the WebView with security settings and bridge communication.
     */
    @SuppressLint("SetJavaScriptEnabled")
    fun createWebView(): WebView {
        // WebViewAssetLoader serves files from android_asset/ under a proper https:// domain,
        // avoiding file:// origin issues with History API, CORS, etc.
        // Custom PathHandler that serves from the self-wallet/ subdirectory of assets.
        // This way, a request to /assets/foo.js resolves to self-wallet/assets/foo.js
        // and /index.html resolves to self-wallet/index.html.
        val selfWalletHandler =
            WebViewAssetLoader.PathHandler { path ->
                try {
                    val assetPath = "self-wallet/$path"
                    val inputStream = context.assets.open(assetPath)
                    val mimeType =
                        when {
                            path.endsWith(".js") -> "application/javascript"
                            path.endsWith(".css") -> "text/css"
                            path.endsWith(".html") -> "text/html"
                            path.endsWith(".json") -> "application/json"
                            path.endsWith(".woff2") -> "font/woff2"
                            path.endsWith(".woff") -> "font/woff"
                            path.endsWith(".otf") -> "font/otf"
                            path.endsWith(".ttf") -> "font/ttf"
                            path.endsWith(".png") -> "image/png"
                            path.endsWith(".svg") -> "image/svg+xml"
                            else -> "application/octet-stream"
                        }
                    WebResourceResponse(mimeType, "UTF-8", inputStream)
                } catch (e: Exception) {
                    null
                }
            }

        val assetLoader =
            WebViewAssetLoader
                .Builder()
                .addPathHandler("/", selfWalletHandler)
                .build()

        webView =
            WebView(context).apply {
                settings.apply {
                    // Enable JavaScript for bridge communication
                    javaScriptEnabled = true
                    domStorageEnabled = true

                    // File access not needed — assets served via WebViewAssetLoader
                    allowFileAccess = false
                    allowContentAccess = false

                    // Media playback
                    mediaPlaybackRequiresUserGesture = false

                    // Enable debugging in debug mode
                    if (isDebugMode) {
                        WebView.setWebContentsDebuggingEnabled(true)
                    }
                }

                webViewClient =
                    object : WebViewClient() {
                        override fun shouldInterceptRequest(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): WebResourceResponse? {
                            request ?: return null
                            return assetLoader.shouldInterceptRequest(request.url)
                        }

                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean {
                            val url = request?.url?.toString() ?: return true
                            val assetHost = "https://appassets.androidplatform.net/"
                            if (url.startsWith(assetHost)) return false
                            if (isDebugMode && url.startsWith("http://10.0.2.2:5173")) return false
                            return true // block everything else
                        }

                        override fun onReceivedSslError(
                            view: WebView?,
                            handler: SslErrorHandler?,
                            error: SslError?,
                        ) {
                            handler?.cancel()
                        }
                    }

                // Register JS interface: WebView → Native communication
                // JavaScript can call: window.SelfNativeAndroid.postMessage(json)
                addJavascriptInterface(BridgeJsInterface(), "SelfNativeAndroid")

                // Load appropriate URL based on mode
                if (isDebugMode) {
                    // Development mode: connect to Vite dev server
                    // Android emulator uses 10.0.2.2 to access host machine's localhost
                    loadUrl("http://10.0.2.2:5173")
                } else {
                    // Production mode: load via WebViewAssetLoader.
                    // The custom PathHandler prepends self-wallet/ to all paths,
                    // so /index.html → self-wallet/index.html in assets,
                    // and /assets/foo.js → self-wallet/assets/foo.js in assets.
                    loadUrl("https://appassets.androidplatform.net/index.html")
                }
            }
        return webView
    }

    /**
     * Sends JavaScript code to the WebView for execution.
     * Used for Native → WebView communication (responses and events).
     */
    fun evaluateJs(js: String) {
        if (!::webView.isInitialized) return
        webView.evaluateJavascript(js, null)
    }

    fun destroy() {
        if (!::webView.isInitialized) return
        webView.destroy()
    }

    /**
     * JavaScript interface exposed to WebView.
     * Allows WebView to send bridge messages to native code.
     */
    inner class BridgeJsInterface {
        /**
         * Called from JavaScript when a bridge request is sent.
         * JavaScript usage: window.SelfNativeAndroid.postMessage(JSON.stringify(message))
         */
        @JavascriptInterface
        fun postMessage(json: String) {
            // Forward to MessageRouter for processing
            router.onMessageReceived(json)
        }
    }
}
