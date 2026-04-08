// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
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
        initVerificationFlow()
    }

    private fun initVerificationFlow() {
        val isDebugMode = intent.getBooleanExtra(EXTRA_DEBUG_MODE, false)

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

        // Build query params from VerificationRequest JSON
        val queryParams = buildQueryParams()
        if (queryParams == null) {
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

        val configJson = intent.getStringExtra(EXTRA_CONFIG) ?: "{}"
        val remoteWebAppBaseUrl =
            try {
                org.json.JSONObject(configJson).optString("remoteWebAppBaseUrl", "https://self-app-alpha.vercel.app")
            } catch (_: Exception) {
                "https://self-app-alpha.vercel.app"
            }

        val devServerUrl = intent.getStringExtra(EXTRA_DEV_SERVER_URL)
        webViewHost = AndroidWebViewHost(this, router, isDebugMode, remoteWebAppBaseUrl, devServerUrl)
        val webView = webViewHost.createWebView(queryParams)
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

    private fun buildQueryParams(): String? {
        val requestJson = intent.getStringExtra(EXTRA_VERIFICATION_REQUEST) ?: return null
        val configJson = intent.getStringExtra(EXTRA_CONFIG) ?: "{}"
        return try {
            val json = org.json.JSONObject(requestJson)
            val config = org.json.JSONObject(configJson)
            buildString {
                var first = true

                fun append(
                    key: String,
                    value: String?,
                ) {
                    if (value.isNullOrEmpty()) return
                    if (!first) append("&")
                    append("$key=${Uri.encode(value)}")
                    first = false
                }

                // Config params (always present)
                val endpoint = config.optString("endpoint", "https://api.self.xyz")
                append("endpoint", endpoint)
                val appEndpoint = config.optString("appEndpoint", null)
                append("appEndpoint", if (appEndpoint.isNullOrEmpty()) endpoint else appEndpoint)
                append("environment", config.optString("environment", "prod"))
                append("version", config.optInt("version", 1).toString())

                // Optional config params
                append("appName", config.optString("appName", null))
                append("endpointType", config.optString("endpointType", null))
                val chainID = config.optInt("chainID", 0)
                if (chainID != 0) append("chainID", chainID.toString())

                // Request params
                append("verificationId", json.optString("verificationId", null))
                append("userId", json.optString("userId", null))
                append("scope", json.optString("scope", null))
                val disclosures = json.optJSONArray("disclosures")
                if (disclosures != null && disclosures.length() > 0) {
                    val items = (0 until disclosures.length()).map { disclosures.getString(it) }
                    append("disclosures", items.joinToString(","))
                }
                append("resultType", json.optString("resultType", null))
                val excludedCountries = json.optJSONArray("excludedCountries")
                if (excludedCountries != null && excludedCountries.length() > 0) {
                    val items = (0 until excludedCountries.length()).map { excludedCountries.getString(it) }
                    append("excludedCountries", items.joinToString(","))
                }
                append("userIdType", json.optString("userIdType", null))
                append("userDefinedData", json.optString("userDefinedData", null))
                append("selfDefinedData", json.optString("selfDefinedData", null))
            }
        } catch (_: Exception) {
            null
        }
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
        const val EXTRA_DEBUG_MODE = "xyz.self.sdk.DEBUG_MODE"
        const val EXTRA_VERIFICATION_REQUEST = "xyz.self.sdk.VERIFICATION_REQUEST"
        const val EXTRA_CONFIG = "xyz.self.sdk.CONFIG"
        const val EXTRA_DEV_SERVER_URL = "xyz.self.sdk.DEV_SERVER_URL"

        const val RESULT_CODE_SUCCESS = RESULT_OK
        const val RESULT_CODE_ERROR = RESULT_FIRST_USER
        const val RESULT_CODE_CANCELLED = RESULT_CANCELED

        const val EXTRA_RESULT_DATA = "xyz.self.sdk.RESULT_DATA"
        const val EXTRA_RESULT_TYPE = "xyz.self.sdk.RESULT_TYPE"
        const val EXTRA_ERROR_CODE = "xyz.self.sdk.ERROR_CODE"
        const val EXTRA_ERROR_MESSAGE = "xyz.self.sdk.ERROR_MESSAGE"
    }
}
