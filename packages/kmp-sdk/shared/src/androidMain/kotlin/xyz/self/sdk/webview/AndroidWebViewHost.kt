package xyz.self.sdk.webview

import android.annotation.SuppressLint
import android.content.Context
import android.net.http.SslError
import android.webkit.JavascriptInterface
import android.webkit.SslErrorHandler
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import xyz.self.sdk.bridge.MessageRouter

/**
 * Manages an Android WebView instance for hosting the Self verification UI.
 * Handles bidirectional communication between WebView JavaScript and native Kotlin code.
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
        webView =
            WebView(context).apply {
                settings.apply {
                    // Enable JavaScript for bridge communication
                    javaScriptEnabled = true
                    domStorageEnabled = true

                    // Security: disable file access
                    allowFileAccess = false
                    allowContentAccess = false

                    // Media playback
                    mediaPlaybackRequiresUserGesture = false

                    // Enable debugging in debug mode
                    if (isDebugMode) {
                        WebView.setWebContentsDebuggingEnabled(true)
                    }
                }

                // Set WebViewClient for URL filtering and SSL security
                webViewClient =
                    object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean {
                            val url = request?.url?.toString() ?: return true
                            if (url.startsWith("file:///android_asset/")) return false
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
                    // Production mode: load bundled assets
                    loadUrl("file:///android_asset/self-wallet/index.html")
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
