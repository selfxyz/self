// SPDX-License-Identifier: BUSL-1.1

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

class AndroidWebViewHost(
    private val context: Context,
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
) {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    fun createWebView(queryParams: String): WebView {
        val selfWalletHandler = WebViewAssetLoader.PathHandler { path ->
            try {
                val assetPath = "self-wallet/$path"
                val inputStream = context.assets.open(assetPath)
                val mimeType = when {
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

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/", selfWalletHandler)
            .build()

        webView = WebView(context).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                mediaPlaybackRequiresUserGesture = false

                if (isDebugMode) {
                    WebView.setWebContentsDebuggingEnabled(true)
                }
            }

            webViewClient = object : WebViewClient() {
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
                    if (url.startsWith("https://appassets.androidplatform.net/")) return false
                    if (isDebugMode && url.startsWith("http://127.0.0.1:5173")) return false
                    return true
                }

                override fun onReceivedSslError(
                    view: WebView?,
                    handler: SslErrorHandler?,
                    error: SslError?,
                ) {
                    handler?.cancel()
                }
            }

            addJavascriptInterface(BridgeJsInterface(), "SelfNativeAndroid")

            if (isDebugMode) {
                loadUrl("http://127.0.0.1:5173?$queryParams")
            } else {
                loadUrl("https://appassets.androidplatform.net/index.html?$queryParams")
            }
        }
        return webView
    }

    fun evaluateJs(js: String) {
        if (!::webView.isInitialized) return
        webView.evaluateJavascript(js, null)
    }

    fun destroy() {
        if (!::webView.isInitialized) return
        webView.destroy()
    }

    inner class BridgeJsInterface {
        @JavascriptInterface
        fun postMessage(json: String) {
            router.onMessageReceived(json)
        }
    }
}
