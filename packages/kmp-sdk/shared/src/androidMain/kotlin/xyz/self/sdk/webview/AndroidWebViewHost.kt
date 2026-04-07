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
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import xyz.self.sdk.bridge.MessageRouter

class AndroidWebViewHost(
    private val context: Context,
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
    private val devServerUrl: String? = null,
) {
    private lateinit var webView: WebView
    var pendingPermissionRequest: PermissionRequest? = null
    var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    fun createWebView(queryParams: String = ""): WebView {
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
                        ): Boolean {
                            val uri = request?.url ?: return true
                            val devHost = devServerUrl?.let { Uri.parse(it) }
                            val isAllowed =
                                (uri.scheme == "https" && uri.host == "self-app-alpha.vercel.app") ||
                                    (isDebugMode && uri.scheme == "http" && uri.host == "127.0.0.1" && uri.port == 5173) ||
                                    (
                                        isDebugMode &&
                                            devHost != null &&
                                            uri.scheme == devHost.scheme &&
                                            uri.host == devHost.host &&
                                            uri.port == devHost.port
                                    )
                            return !isAllowed
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
                            val origin =
                                request.origin ?: run {
                                    request.deny()
                                    return
                                }
                            val devHost = devServerUrl?.let { Uri.parse(it) }
                            val isTrusted =
                                (origin.scheme == "https" && origin.host == "self-app-alpha.vercel.app") ||
                                    (origin.scheme == "https" && origin.host == "verify.didit.me") ||
                                    (isDebugMode && origin.scheme == "http" && origin.host == "127.0.0.1" && origin.port == 5173) ||
                                    (
                                        isDebugMode &&
                                            devHost != null &&
                                            origin.scheme == devHost.scheme &&
                                            origin.host == devHost.host &&
                                            origin.port == devHost.port
                                    )
                            if (!isTrusted) {
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

                addJavascriptInterface(BridgeJsInterface(), "SelfNativeAndroid")

                val baseUrl =
                    if (isDebugMode && devServerUrl != null) {
                        "${devServerUrl.trimEnd('/')}/tunnel/tour/1"
                    } else {
                        "https://self-app-alpha.vercel.app/tunnel/tour/1"
                    }
                val url = if (queryParams.isNotEmpty()) "$baseUrl?$queryParams" else baseUrl
                loadUrl(url)
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

    companion object {
        const val FILE_CHOOSER_REQUEST_CODE = 1001
        const val CAMERA_PERMISSION_REQUEST_CODE = 1002
    }
}
