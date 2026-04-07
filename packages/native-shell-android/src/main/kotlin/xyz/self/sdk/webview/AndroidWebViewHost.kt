// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.net.http.SslError
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import xyz.self.sdk.api.DEFAULT_REMOTE_WEB_APP_BASE_URL
import xyz.self.sdk.bridge.MessageRouter
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

class AndroidWebViewHost(
    private val context: Context,
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
    private val remoteWebAppBaseUrl: String? = DEFAULT_REMOTE_WEB_APP_BASE_URL,
    private val remoteWebAppIntegritySha256: String? = null,
) {
    private lateinit var webView: WebView
    private val bundledAssetsAvailable by lazy { hasBundledAssets() }

    @Volatile
    private var isDestroyed = false
    var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    var pendingPermissionRequest: PermissionRequest? = null

    @SuppressLint("SetJavaScriptEnabled")
    fun createWebView(queryParams: String): WebView {
        isDestroyed = false
        val selfWalletHandler =
            WebViewAssetLoader.PathHandler { rawPath ->
                try {
                    val normalizedPath = rawPath.removePrefix("/")
                    val assetPath =
                        if (normalizedPath.isEmpty() || !normalizedPath.contains('.')) {
                            "self-wallet/index.html"
                        } else {
                            "self-wallet/$normalizedPath"
                        }
                    val inputStream = context.assets.open(assetPath)
                    val mimeType =
                        when {
                            assetPath.endsWith(".js") -> "application/javascript"
                            assetPath.endsWith(".css") -> "text/css"
                            assetPath.endsWith(".html") -> "text/html"
                            assetPath.endsWith(".json") -> "application/json"
                            assetPath.endsWith(".woff2") -> "font/woff2"
                            assetPath.endsWith(".woff") -> "font/woff"
                            assetPath.endsWith(".otf") -> "font/otf"
                            assetPath.endsWith(".ttf") -> "font/ttf"
                            assetPath.endsWith(".png") -> "image/png"
                            assetPath.endsWith(".svg") -> "image/svg+xml"
                            else -> "application/octet-stream"
                        }
                    WebResourceResponse(mimeType, "UTF-8", inputStream)
                } catch (_: Exception) {
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
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    allowFileAccess = false
                    allowContentAccess = false
                    mediaPlaybackRequiresUserGesture = false

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
                            val url = request.url
                            if (url.host != BUNDLED_HOST) return null
                            return assetLoader.shouldInterceptRequest(url)
                        }

                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean {
                            val url = request?.url ?: return true
                            return !shouldAllowNavigation(url.toString())
                        }

                        override fun onReceivedSslError(
                            view: WebView?,
                            handler: SslErrorHandler?,
                            error: SslError?,
                        ) {
                            handler?.cancel()
                        }
                    }

                webChromeClient =
                    object : WebChromeClient() {
                        override fun onPermissionRequest(request: PermissionRequest?) {
                            request ?: return

                            val originStr = request.origin?.toString() ?: ""
                            val originUri = Uri.parse(originStr)
                            val isTrusted =
                                isBundledOrigin(originUri) ||
                                    (isDebugMode && isDebugOrigin(originUri)) ||
                                    isMatchingOrigin(originUri, "https", "verify.didit.me", 443) ||
                                    isAllowedRemoteOrigin(originStr) ||
                                    isDefaultHostedOrigin(originStr)
                            if (!isTrusted) {
                                request.deny()
                                return
                            }

                            val activity =
                                context as? Activity ?: run {
                                    request.deny()
                                    return
                                }

                            val neededPermissions = mutableListOf<String>()
                            if (request.resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                                neededPermissions.add(Manifest.permission.CAMERA)
                            }
                            if (request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                                neededPermissions.add(Manifest.permission.RECORD_AUDIO)
                            }

                            val missingPermissions =
                                neededPermissions.filter {
                                    ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
                                }

                            if (missingPermissions.isNotEmpty()) {
                                pendingPermissionRequest = request
                                ActivityCompat.requestPermissions(
                                    activity,
                                    missingPermissions.toTypedArray(),
                                    CAMERA_PERMISSION_REQUEST_CODE,
                                )
                                return
                            }

                            request.grant(request.resources)
                        }

                        override fun onShowFileChooser(
                            webView: WebView?,
                            filePathCallback: ValueCallback<Array<Uri>>?,
                            fileChooserParams: FileChooserParams?,
                        ): Boolean {
                            fileUploadCallback?.onReceiveValue(null)
                            fileUploadCallback = filePathCallback

                            val intent = fileChooserParams?.createIntent() ?: return false
                            val activity =
                                context as? Activity ?: run {
                                    fileUploadCallback = null
                                    return false
                                }
                            try {
                                activity.startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                            } catch (_: Exception) {
                                fileUploadCallback = null
                                return false
                            }
                            return true
                        }
                    }

                addJavascriptInterface(BridgeJsInterface(), "SelfNativeAndroid")

                if (isDebugMode) {
                    loadUrl(buildDebugUrl(queryParams))
                } else {
                    loadContent(queryParams)
                }
            }
        return webView
    }

    fun evaluateJs(js: String) {
        if (!::webView.isInitialized) {
            Log.e("WebViewHost", "evaluateJs called but webView not initialized")
            return
        }
        webView.evaluateJavascript(js, null)
    }

    fun destroy() {
        if (!::webView.isInitialized) return
        isDestroyed = true
        webView.destroy()
    }

    private fun buildBundledUrl(queryParams: String): String = buildEntryUrl(BUNDLED_ORIGIN, queryParams)

    private fun buildDebugUrl(queryParams: String): String = buildEntryUrl(DEBUG_ORIGIN, queryParams)

    private fun buildRemoteUrl(queryParams: String): String? = RemoteNavigationPolicy.buildRemoteEntryUrl(remoteWebAppBaseUrl, queryParams)

    internal fun resolveInitialContentUrl(
        queryParams: String,
        bundledFallbackAvailable: Boolean = bundledAssetsAvailable,
    ): String? {
        val remoteUrl = buildRemoteUrl(queryParams)
        if (remoteUrl != null) return remoteUrl
        if (bundledFallbackAvailable && remoteWebAppBaseUrl.isNullOrBlank()) {
            return buildBundledUrl(queryParams)
        }
        return null
    }

    internal fun shouldAllowNavigation(url: String): Boolean {
        val uri = Uri.parse(url)
        if (isBundledOrigin(uri)) return true
        if (isDebugMode && isDebugOrigin(uri)) return true
        if (isAllowedRemoteOrigin(url)) return true
        if (isDefaultHostedOrigin(url)) return true
        return false
    }

    private fun buildEntryUrl(
        baseUrl: String,
        queryParams: String,
    ): String {
        val separator = if (queryParams.isEmpty()) "" else "?$queryParams"
        return "$baseUrl/tunnel/tour/1$separator"
    }

    private fun loadContent(queryParams: String) {
        val initialUrl = resolveInitialContentUrl(queryParams) ?: return
        if (initialUrl.startsWith(BUNDLED_ORIGIN)) {
            webView.loadUrl(initialUrl)
            return
        }
        if (!maybeLoadVerifiedRemoteContent(initialUrl)) {
            webView.loadUrl(initialUrl)
        }
    }

    private fun maybeLoadVerifiedRemoteContent(remoteUrl: String): Boolean {
        val expectedSha256 = remoteWebAppIntegritySha256?.takeIf { it.isNotBlank() } ?: return false

        Thread {
            val verifiedHtml = fetchAndVerifyRemoteEntry(remoteUrl, expectedSha256)
            if (verifiedHtml == null || !::webView.isInitialized || isDestroyed) {
                return@Thread
            }

            webView.post {
                if (::webView.isInitialized && !isDestroyed) {
                    webView.loadDataWithBaseURL(
                        remoteUrl,
                        verifiedHtml,
                        "text/html",
                        "UTF-8",
                        null,
                    )
                }
            }
        }.start()
        return true
    }

    private fun fetchAndVerifyRemoteEntry(
        remoteUrl: String,
        expectedSha256: String,
    ): String? =
        try {
            val connection = URL(remoteUrl).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.instanceFollowRedirects = false
            connection.connectTimeout = 5_000
            connection.readTimeout = 5_000
            connection.connect()

            if (connection.responseCode !in 200..299) {
                Log.w("WebViewHost", "Remote web app integrity check failed with HTTP ${connection.responseCode}")
                null
            } else if (!RemoteContentIntegrity.isAcceptableContentType(connection.contentType)) {
                Log.w("WebViewHost", "Remote web app integrity check failed due to unexpected content type ${connection.contentType}")
                null
            } else {
                val body =
                    connection.inputStream.use { stream ->
                        val buffer = java.io.ByteArrayOutputStream()
                        val chunk = ByteArray(8192)
                        var totalRead = 0
                        var bytesRead: Int
                        while (stream.read(chunk).also { bytesRead = it } != -1) {
                            totalRead += bytesRead
                            if (totalRead > MAX_REMOTE_ENTRY_BYTES) {
                                throw IllegalStateException("Remote entry response exceeded ${MAX_REMOTE_ENTRY_BYTES} bytes")
                            }
                            buffer.write(chunk, 0, bytesRead)
                        }
                        buffer.toByteArray()
                    }
                if (sha256Hex(body) == normalizeSha256(expectedSha256)) {
                    String(body, Charsets.UTF_8)
                } else {
                    Log.w("WebViewHost", "Remote web app integrity check failed: hash mismatch")
                    null
                }
            }
        } catch (error: Exception) {
            Log.w("WebViewHost", "Remote web app integrity check failed", error)
            null
        }

    private fun isAllowedRemoteOrigin(url: String): Boolean = RemoteNavigationPolicy.isAllowedRemoteOrigin(url, remoteWebAppBaseUrl)

    private fun isDefaultHostedOrigin(url: String): Boolean =
        RemoteNavigationPolicy.isAllowedRemoteOrigin(url, DEFAULT_REMOTE_WEB_APP_BASE_URL)

    private fun hasBundledAssets(): Boolean =
        try {
            context.assets.open("self-wallet/index.html").use { true }
        } catch (_: Exception) {
            false
        }

    private fun resolvePort(uri: Uri): Int = RemoteNavigationPolicy.resolvePort(URI(uri.toString()))

    private fun sha256Hex(bytes: ByteArray): String = RemoteContentIntegrity.sha256Hex(bytes)

    private fun normalizeSha256(value: String): String = RemoteContentIntegrity.normalizeSha256(value)

    inner class BridgeJsInterface {
        @JavascriptInterface
        fun postMessage(json: String) {
            router.onMessageReceived(json)
        }
    }

    private fun isBundledOrigin(uri: Uri): Boolean = isMatchingOrigin(uri, "https", BUNDLED_HOST, 443)

    private fun isDebugOrigin(uri: Uri): Boolean = isMatchingOrigin(uri, "http", "127.0.0.1", 5173)

    private fun isMatchingOrigin(
        uri: Uri,
        scheme: String,
        host: String,
        port: Int,
    ): Boolean = uri.scheme == scheme && uri.host == host && resolvePort(uri) == port

    companion object {
        private const val BUNDLED_HOST = "appassets.androidplatform.net"
        private const val BUNDLED_ORIGIN = "https://$BUNDLED_HOST"
        private const val DEBUG_ORIGIN = "http://127.0.0.1:5173"

        const val FILE_CHOOSER_REQUEST_CODE = 1001
        const val CAMERA_PERMISSION_REQUEST_CODE = 1002
        private const val MAX_REMOTE_ENTRY_BYTES = 5 * 1024 * 1024
    }
}
