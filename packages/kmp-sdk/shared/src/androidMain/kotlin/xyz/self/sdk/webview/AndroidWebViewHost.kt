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
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import xyz.self.sdk.api.SdkConstants
import xyz.self.sdk.bridge.MessageRouter

class AndroidWebViewHost(
    private val context: Context,
    private val router: MessageRouter,
    private val isDebugMode: Boolean = false,
    private val isDebuggable: Boolean = false,
    private val remoteWebAppBaseUrl: String = SdkConstants.DEFAULT_REMOTE_WEB_APP_BASE_URL,
    private val devServerUrl: String? = null,
) {
    private lateinit var webView: WebView
    var pendingPermissionRequest: PermissionRequest? = null
    var fileUploadCallback: ValueCallback<Array<Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    fun createWebView(queryParams: String = ""): WebView {
        val effectiveDebug = isDebugMode && isDebuggable
        webView =
            WebView(context).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    allowFileAccess = false
                    allowContentAccess = false
                    mediaPlaybackRequiresUserGesture = false

                    if (effectiveDebug) {
                        WebView.setWebContentsDebuggingEnabled(true)
                    }
                }

                webViewClient =
                    object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean =
                            !UrlPolicy.isAllowedNavigationUrl(request?.url?.toString(), effectiveDebug, remoteWebAppBaseUrl, devServerUrl)

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
                            if (!UrlPolicy.isTrustedPermissionOrigin(
                                    origin.toString(),
                                    effectiveDebug,
                                    remoteWebAppBaseUrl,
                                    devServerUrl,
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
                                @Suppress("DEPRECATION")
                                activity.startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                            } catch (e: Exception) {
                                fileUploadCallback = null
                                return false
                            }
                            return true
                        }
                    }

                installBridge(webView = this, effectiveDebug = effectiveDebug)

                loadUrl(UrlPolicy.initialContentUrl(queryParams, effectiveDebug, remoteWebAppBaseUrl, devServerUrl))
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

    private fun installBridge(
        webView: WebView,
        effectiveDebug: Boolean,
    ) {
        check(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            "WEB_MESSAGE_LISTENER not supported — native bridge unavailable on this device"
        }

        WebViewCompat.addWebMessageListener(
            webView,
            "SelfNativeAndroid",
            buildAllowedOriginRules(effectiveDebug),
        ) { _, message: WebMessageCompat, sourceOrigin, isMainFrame, _ ->
            if (!isMainFrame) {
                return@addWebMessageListener
            }

            val rawJson = message.data ?: return@addWebMessageListener
            router.onMessageReceived(
                rawJson = rawJson,
                isTrustedSource =
                    UrlPolicy.isTrustedBridgeOrigin(
                        sourceOrigin.toString(),
                        effectiveDebug,
                        remoteWebAppBaseUrl,
                        devServerUrl,
                    ),
            )
        }
    }

    private fun buildAllowedOriginRules(effectiveDebug: Boolean): Set<String> =
        UrlPolicy.allowedOrigins(effectiveDebug, remoteWebAppBaseUrl, devServerUrl)

    companion object {
        const val FILE_CHOOSER_REQUEST_CODE = 1001
        const val CAMERA_PERMISSION_REQUEST_CODE = 1002
    }
}
