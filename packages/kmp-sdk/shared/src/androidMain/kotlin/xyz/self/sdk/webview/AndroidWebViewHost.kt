// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.net.Uri
import android.net.http.SslError
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
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import xyz.self.sdk.bridge.MessageRouter

class AndroidWebViewHost(
    private val context: Context,
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
) {
    private lateinit var webView: WebView
    var pendingPermissionRequest: PermissionRequest? = null
    var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    fun createWebView(queryParams: String = ""): WebView {
        val assetLoader =
            WebViewAssetLoader
                .Builder()
                .addPathHandler("/", BundledAssetPathHandler(context))
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
                            if (!isBundledAssetUrl(url.toString())) return null
                            return assetLoader.shouldInterceptRequest(url)
                        }

                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean = !isAllowedNavigationUrl(request?.url?.toString(), isDebugMode)

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
                            val origin =
                                request.origin ?: run {
                                    request.deny()
                                    return
                                }
                            if (!isTrustedPermissionOrigin(origin.toString(), isDebugMode)) {
                                request.deny()
                                return
                            }

                            val activity =
                                context as? Activity ?: run {
                                    request.deny()
                                    return
                                }

                            val allowedResources =
                                request.resources.filter {
                                    it == PermissionRequest.RESOURCE_VIDEO_CAPTURE ||
                                        it == PermissionRequest.RESOURCE_AUDIO_CAPTURE
                                }
                            if (allowedResources.size != request.resources.size) {
                                request.deny()
                                return
                            }

                            val neededPermissions = mutableListOf<String>()
                            if (allowedResources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                                neededPermissions.add(Manifest.permission.CAMERA)
                            }
                            if (allowedResources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
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

                            request.grant(allowedResources.toTypedArray())
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
                                @Suppress("DEPRECATION")
                                activity.startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                            } catch (e: Exception) {
                                fileUploadCallback = null
                                return false
                            }
                            return true
                        }
                    }

                installBridge(webView = this)

                loadUrl(initialContentUrl(queryParams, isDebugMode))
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

    private fun installBridge(webView: WebView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            android.util.Log.e(
                "WebViewHost",
                "WEB_MESSAGE_LISTENER not supported — native bridge unavailable on this device",
            )
            return
        }

        WebViewCompat.addWebMessageListener(
            webView,
            "SelfNativeAndroid",
            buildAllowedOriginRules(isDebugMode),
        ) { _, message: WebMessageCompat, _, isMainFrame, _ ->
            if (!isMainFrame) {
                return@addWebMessageListener
            }

            val rawJson = message.data ?: return@addWebMessageListener
            router.onMessageReceived(
                rawJson = rawJson,
                isTrustedSource = isTrustedBridgeOrigin(currentWebViewUrl(), isDebugMode),
            )
        }
    }

    companion object {
        const val FILE_CHOOSER_REQUEST_CODE = 1001
        const val CAMERA_PERMISSION_REQUEST_CODE = 1002
        private const val BUNDLED_ASSET_HOST = "appassets.androidplatform.net"
        private const val BUNDLED_TOUR_PATH = "/tunnel/tour/1"
        private const val DEBUG_HOST = "127.0.0.1"
        private const val DEBUG_PORT = 5173
        private const val DIDIT_HOST = "verify.didit.me"

        internal fun initialContentUrl(
            queryParams: String,
            isDebugMode: Boolean,
        ): String =
            if (isDebugMode) {
                buildString {
                    append("http://")
                        .append(DEBUG_HOST)
                        .append(":")
                        .append(DEBUG_PORT)
                        .append(BUNDLED_TOUR_PATH)
                    if (queryParams.isNotEmpty()) {
                        append("?").append(queryParams)
                    }
                }
            } else {
                buildString {
                    append("https://").append(BUNDLED_ASSET_HOST).append(BUNDLED_TOUR_PATH)
                    if (queryParams.isNotEmpty()) {
                        append("?").append(queryParams)
                    }
                }
            }

        internal fun isAllowedNavigationUrl(
            rawUrl: String?,
            isDebugMode: Boolean,
        ): Boolean =
            isBundledAssetUrl(rawUrl) ||
                isDiditUrl(rawUrl) ||
                (isDebugMode && isDebugLocalUrl(rawUrl))

        internal fun isTrustedPermissionOrigin(
            rawUrl: String?,
            isDebugMode: Boolean,
        ): Boolean =
            isBundledAssetUrl(rawUrl) ||
                isDiditUrl(rawUrl) ||
                (isDebugMode && isDebugLocalUrl(rawUrl))

        internal fun isTrustedBridgeOrigin(
            rawUrl: String?,
            isDebugMode: Boolean,
        ): Boolean =
            isBundledAssetUrl(rawUrl) ||
                (isDebugMode && isDebugLocalUrl(rawUrl))

        internal fun isBundledAssetUrl(rawUrl: String?): Boolean = uriScheme(rawUrl) == "https" && uriHost(rawUrl) == BUNDLED_ASSET_HOST

        private fun isDiditUrl(rawUrl: String?): Boolean = uriScheme(rawUrl) == "https" && uriHost(rawUrl) == DIDIT_HOST

        private fun isDebugLocalUrl(rawUrl: String?): Boolean =
            uriScheme(rawUrl) == "http" && uriHost(rawUrl) == DEBUG_HOST && uriPort(rawUrl) == DEBUG_PORT

        private fun buildAllowedOriginRules(isDebugMode: Boolean): Set<String> =
            buildSet {
                add("https://$BUNDLED_ASSET_HOST")
                if (isDebugMode) {
                    add("http://$DEBUG_HOST:$DEBUG_PORT")
                }
            }

        private fun uriScheme(rawUrl: String?): String? = parseUri(rawUrl)?.scheme

        private fun uriHost(rawUrl: String?): String? = parseUri(rawUrl)?.host ?: parseUri(rawUrl)?.authority

        private fun uriPort(rawUrl: String?): Int? = parseUri(rawUrl)?.port?.takeIf { it != -1 }

        private fun parseUri(rawUrl: String?): java.net.URI? = rawUrl?.let { raw -> runCatching { java.net.URI(raw) }.getOrNull() }
    }

    private fun currentWebViewUrl(): String? = webView.url

    private class BundledAssetPathHandler(
        private val context: Context,
    ) : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            val normalizedPath = path.trimStart('/')
            val assetCandidates =
                buildList {
                    if (normalizedPath.isNotEmpty()) {
                        add("self-wallet/$normalizedPath")
                    }
                    if (!normalizedPath.contains('.')) {
                        add("self-wallet/index.html")
                    }
                }

            for (assetPath in assetCandidates) {
                val inputStream =
                    try {
                        context.assets.open(assetPath)
                    } catch (_: Exception) {
                        null
                    } ?: continue

                return WebResourceResponse(
                    mimeTypeForAssetPath(assetPath),
                    "UTF-8",
                    inputStream,
                )
            }

            return null
        }

        private fun mimeTypeForAssetPath(path: String): String =
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
                path.endsWith(".wav") -> "audio/wav"
                else -> "application/octet-stream"
            }
    }
}
