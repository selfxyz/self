// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import xyz.self.sdk.api.QueryParamsBuilder
import xyz.self.sdk.api.SelfSdkConfig
import xyz.self.sdk.api.VerificationRequest
import xyz.self.sdk.api.verificationResultJson
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.handlers.CryptoBridgeHandler
import xyz.self.sdk.handlers.LifecycleBridgeHandler
import xyz.self.sdk.handlers.SecureStorageBridgeHandler
import xyz.self.sdk.providers.AndroidKeystoreCryptoProvider
import xyz.self.sdk.providers.EncryptedSharedPreferencesProvider
import xyz.self.sdk.providers.SdkProviderRegistry

class SelfVerificationActivity : AppCompatActivity() {
    private lateinit var webViewHost: AndroidWebViewHost
    private lateinit var router: MessageRouter
    private var container: FrameLayout? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        initVerificationFlow()
    }

    private fun initVerificationFlow() {
        val configJson = intent.getStringExtra(EXTRA_CONFIG) ?: "{}"
        val requestJson = intent.getStringExtra(EXTRA_VERIFICATION_REQUEST)

        val config =
            try {
                verificationResultJson.decodeFromString(SelfSdkConfig.serializer(), configJson)
            } catch (_: Exception) {
                null
            }
        val request =
            if (requestJson != null) {
                try {
                    verificationResultJson.decodeFromString(VerificationRequest.serializer(), requestJson)
                } catch (_: Exception) {
                    null
                }
            } else {
                null
            }

        if (config == null || request == null) {
            setResult(
                RESULT_CODE_ERROR,
                Intent().apply {
                    putExtra(EXTRA_ERROR_CODE, "INVALID_BOOTSTRAP")
                    putExtra(EXTRA_ERROR_MESSAGE, "Invalid verification request/config payload")
                },
            )
            finish()
            return
        }

        // Register default providers if consumer hasn't set custom ones
        if (SdkProviderRegistry.secureStorage == null) {
            SdkProviderRegistry.secureStorage = EncryptedSharedPreferencesProvider(this)
        }
        if (SdkProviderRegistry.crypto == null) {
            SdkProviderRegistry.crypto = AndroidKeystoreCryptoProvider()
        }

        router =
            MessageRouter(
                sendToWebView = { js ->
                    runOnUiThread {
                        webViewHost.evaluateJs(js)
                    }
                },
            )

        registerHandlers()

        val queryParams = QueryParamsBuilder.build(config, request)
        val isDebuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

        webViewHost = AndroidWebViewHost(this, router, config.debug, isDebuggable, config.remoteWebAppBaseUrl, config.devServerUrl)
        val webView = webViewHost.createWebView(queryParams ?: "")
        val wrapper =
            FrameLayout(this).apply {
                addView(
                    webView,
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    ),
                )
            }
        this.container = wrapper
        setContentView(wrapper)

        ViewCompat.setOnApplyWindowInsetsListener(wrapper) { view, insets ->
            val systemInsets =
                insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout(),
                )
            view.setPadding(
                systemInsets.left,
                systemInsets.top,
                systemInsets.right,
                systemInsets.bottom,
            )
            WindowInsetsCompat.CONSUMED
        }
    }

    private fun registerHandlers() {
        router.register(SecureStorageBridgeHandler())
        router.register(CryptoBridgeHandler())
        router.register(LifecycleBridgeHandler(this))
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == AndroidWebViewHost.CAMERA_PERMISSION_REQUEST_CODE) {
            val pending = webViewHost.pendingPermissionRequest ?: return
            if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                pending.grant(pending.resources)
            } else {
                pending.deny()
            }
            webViewHost.pendingPermissionRequest = null
        }
    }

    @Deprecated("Use Activity Result API")
    override fun onActivityResult(
        requestCode: Int,
        resultCode: Int,
        data: Intent?,
    ) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == AndroidWebViewHost.FILE_CHOOSER_REQUEST_CODE) {
            val results =
                if (resultCode == RESULT_OK && data != null) {
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                } else {
                    null
                }
            webViewHost.fileUploadCallback?.onReceiveValue(results)
            webViewHost.fileUploadCallback = null
        }
    }

    override fun onDestroy() {
        container?.let { ViewCompat.setOnApplyWindowInsetsListener(it, null) }
        if (::webViewHost.isInitialized) {
            webViewHost.destroy()
        }
        super.onDestroy()
    }

    companion object {
        const val EXTRA_VERIFICATION_REQUEST = "xyz.self.sdk.VERIFICATION_REQUEST"
        const val EXTRA_CONFIG = "xyz.self.sdk.CONFIG"

        const val RESULT_CODE_SUCCESS = RESULT_OK
        const val RESULT_CODE_ERROR = RESULT_FIRST_USER
        const val RESULT_CODE_CANCELLED = RESULT_CANCELED

        const val EXTRA_RESULT_DATA = "xyz.self.sdk.RESULT_DATA"
        const val EXTRA_RESULT_TYPE = "xyz.self.sdk.RESULT_TYPE"
        const val EXTRA_ERROR_CODE = "xyz.self.sdk.ERROR_CODE"
        const val EXTRA_ERROR_MESSAGE = "xyz.self.sdk.ERROR_MESSAGE"
    }
}
