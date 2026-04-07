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
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import xyz.self.sdk.bridge.MessageRouter
import java.net.URI

class AndroidWebViewHost(
    private val context: Context,
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
    private val remoteWebAppBaseUrl: String = DEFAULT_REMOTE_BASE_URL,
) {
    private lateinit var webView: WebView

    @Volatile
    private var isDestroyed = false
    var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    var pendingPermissionRequest: PermissionRequest? = null

    @SuppressLint("SetJavaScriptEnabled")
    fun createWebView(queryParams: String): WebView {
        isDestroyed = false

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
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean =
                            !isAllowedNavigationUrl(
                                request?.url?.toString(),
                                isDebugMode,
                                remoteWebAppBaseUrl,
                            )

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

                            if (
                                !isTrustedPermissionOrigin(
                                    request.origin?.toString(),
                                    isDebugMode,
                                    remoteWebAppBaseUrl,
                                )
                            ) {
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
                                activity.startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                            } catch (_: Exception) {
                                fileUploadCallback = null
                                return false
                            }
                            return true
                        }
                    }

                installBridge(webView = this)

                loadUrl(initialContentUrl(queryParams, isDebugMode, remoteWebAppBaseUrl))
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

    private fun installBridge(webView: WebView) {
        check(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            "WEB_MESSAGE_LISTENER not supported — native bridge unavailable on this device"
        }

        WebViewCompat.addWebMessageListener(
            webView,
            "SelfNativeAndroid",
            buildAllowedOriginRules(isDebugMode, remoteWebAppBaseUrl),
        ) { _, message: WebMessageCompat, sourceOrigin, isMainFrame, _ ->
            if (!isMainFrame) {
                return@addWebMessageListener
            }

            val rawJson = message.data ?: return@addWebMessageListener
            router.onMessageReceived(
                rawJson = rawJson,
                isTrustedSource =
                    isTrustedBridgeOrigin(
                        sourceOrigin.toString(),
                        isDebugMode,
                        remoteWebAppBaseUrl,
                    ),
            )
        }
    }

    companion object {
        const val FILE_CHOOSER_REQUEST_CODE = 1001
        const val CAMERA_PERMISSION_REQUEST_CODE = 1002
        private const val DEFAULT_REMOTE_BASE_URL = "https://self-app-alpha.vercel.app"
        private const val BUNDLED_TOUR_PATH = "/tunnel/tour/1"
        private const val DEBUG_HOST = "127.0.0.1"
        private const val DEBUG_PORT = 5173
        private const val DIDIT_HOST = "verify.didit.me"

        internal fun initialContentUrl(
            queryParams: String,
            isDebugMode: Boolean,
            remoteWebAppBaseUrl: String = DEFAULT_REMOTE_BASE_URL,
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
                    append(remoteWebAppBaseUrl.trimEnd('/')).append(BUNDLED_TOUR_PATH)
                    if (queryParams.isNotEmpty()) {
                        append("?").append(queryParams)
                    }
                }
            }

        internal fun isAllowedNavigationUrl(
            rawUrl: String?,
            isDebugMode: Boolean,
            remoteWebAppBaseUrl: String? = null,
        ): Boolean =
            isRemoteOrigin(rawUrl, remoteWebAppBaseUrl) ||
                isDiditUrl(rawUrl) ||
                (isDebugMode && isDebugLocalUrl(rawUrl))

        internal fun isTrustedPermissionOrigin(
            rawUrl: String?,
            isDebugMode: Boolean,
            remoteWebAppBaseUrl: String? = null,
        ): Boolean =
            isRemoteOrigin(rawUrl, remoteWebAppBaseUrl) ||
                isDiditUrl(rawUrl) ||
                (isDebugMode && isDebugLocalUrl(rawUrl))

        internal fun isTrustedBridgeOrigin(
            rawUrl: String?,
            isDebugMode: Boolean,
            remoteWebAppBaseUrl: String? = null,
        ): Boolean =
            isRemoteOrigin(rawUrl, remoteWebAppBaseUrl) ||
                (isDebugMode && isDebugLocalUrl(rawUrl))

        private fun isDiditUrl(rawUrl: String?): Boolean = uriScheme(rawUrl) == "https" && uriHost(rawUrl) == DIDIT_HOST

        private fun isDebugLocalUrl(rawUrl: String?): Boolean =
            uriScheme(rawUrl) == "http" && uriHost(rawUrl) == DEBUG_HOST && uriPort(rawUrl) == DEBUG_PORT

        private fun buildAllowedOriginRules(
            isDebugMode: Boolean,
            remoteWebAppBaseUrl: String? = null,
        ): Set<String> =
            buildSet {
                remoteWebAppBaseUrl
                    ?.let(::buildOriginRule)
                    ?.let(::add)
                if (isDebugMode) {
                    add("http://$DEBUG_HOST:$DEBUG_PORT")
                }
            }

        private fun buildOriginRule(rawUrl: String): String? {
            val uri = parseUri(rawUrl) ?: return null
            val scheme = uri.scheme ?: return null
            val host = uri.host ?: return null
            val port = uri.port.takeIf { it != -1 }

            return buildString {
                append(scheme).append("://").append(host)
                if (port != null) {
                    append(":").append(port)
                }
            }
        }

        private fun isRemoteOrigin(
            rawUrl: String?,
            remoteWebAppBaseUrl: String?,
        ): Boolean = rawUrl?.let { RemoteNavigationPolicy.isAllowedRemoteOrigin(it, remoteWebAppBaseUrl) } ?: false

        private fun uriScheme(rawUrl: String?): String? = parseUri(rawUrl)?.scheme

        private fun uriHost(rawUrl: String?): String? = parseUri(rawUrl)?.host ?: parseUri(rawUrl)?.authority

        private fun uriPort(rawUrl: String?): Int? = parseUri(rawUrl)?.port?.takeIf { it != -1 }

        private fun parseUri(rawUrl: String?): java.net.URI? = rawUrl?.let { raw -> runCatching { java.net.URI(raw) }.getOrNull() }
    }
}
