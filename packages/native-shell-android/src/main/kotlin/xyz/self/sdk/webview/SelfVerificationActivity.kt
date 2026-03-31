// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import androidx.appcompat.app.AppCompatActivity
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.handlers.CryptoHandler
import xyz.self.sdk.handlers.LifecycleHandler
import xyz.self.sdk.handlers.SecureStorageHandler

class SelfVerificationActivity : AppCompatActivity() {
    private lateinit var webViewHost: AndroidWebViewHost
    private lateinit var router: MessageRouter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val isDebugMode = intent.getBooleanExtra(EXTRA_DEBUG_MODE, false)
        val environment = intent.getStringExtra(EXTRA_ENVIRONMENT) ?: "prod"
        val verificationId = intent.getStringExtra(EXTRA_VERIFICATION_ID) ?: ""
        val userId = intent.getStringExtra(EXTRA_USER_ID) ?: ""
        val version = intent.getIntExtra(EXTRA_VERSION, 1)
        val scope = intent.getStringExtra(EXTRA_SCOPE)
        val disclosures = intent.getStringArrayListExtra(EXTRA_DISCLOSURES)
        val appName = intent.getStringExtra(EXTRA_APP_NAME)
        val appEndpoint = intent.getStringExtra(EXTRA_APP_ENDPOINT)
        val resultType = intent.getStringExtra(EXTRA_RESULT_TYPE)

        router = MessageRouter(
            sendToWebView = { js ->
                runOnUiThread { webViewHost.evaluateJs(js) }
            },
        )

        router.register(SecureStorageHandler(this))
        router.register(CryptoHandler())
        router.register(LifecycleHandler(this))

        webViewHost = AndroidWebViewHost(this, router, isDebugMode)

        val queryParams = buildString {
            append("environment=").append(Uri.encode(environment))
            append("&verificationId=").append(Uri.encode(verificationId))
            append("&userId=").append(Uri.encode(userId))
            append("&version=").append(version)
            scope?.let { append("&scope=").append(Uri.encode(it)) }
            disclosures?.takeIf { it.isNotEmpty() }?.let {
                append("&disclosures=").append(Uri.encode(it.joinToString(",")))
            }
            appName?.let { append("&appName=").append(Uri.encode(it)) }
            appEndpoint?.let { append("&appEndpoint=").append(Uri.encode(it)) }
            resultType?.let { append("&resultType=").append(Uri.encode(it)) }
        }

        val webView = webViewHost.createWebView(queryParams)
        setContentView(webView)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == AndroidWebViewHost.CAMERA_PERMISSION_REQUEST_CODE) {
            val pending = webViewHost.pendingPermissionRequest
            if (pending != null) {
                if (grantResults.isNotEmpty() && grantResults[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    pending.grant(pending.resources)
                } else {
                    pending.deny()
                }
                webViewHost.pendingPermissionRequest = null
            }
        }
    }

    @Deprecated("Use Activity Result API")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == AndroidWebViewHost.FILE_CHOOSER_REQUEST_CODE) {
            val results = if (resultCode == RESULT_OK && data != null) {
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            } else {
                null
            }
            webViewHost.fileUploadCallback?.onReceiveValue(results)
            webViewHost.fileUploadCallback = null
        }
    }

    override fun onDestroy() {
        if (::webViewHost.isInitialized) {
            webViewHost.destroy()
        }
        super.onDestroy()
    }

    companion object {
        const val EXTRA_DEBUG_MODE = "xyz.self.sdk.DEBUG_MODE"
        const val EXTRA_ENVIRONMENT = "xyz.self.sdk.ENVIRONMENT"
        const val EXTRA_VERIFICATION_ID = "xyz.self.sdk.VERIFICATION_ID"
        const val EXTRA_USER_ID = "xyz.self.sdk.USER_ID"
        const val EXTRA_VERSION = "xyz.self.sdk.VERSION"
        const val EXTRA_SCOPE = "xyz.self.sdk.SCOPE"
        const val EXTRA_DISCLOSURES = "xyz.self.sdk.DISCLOSURES"
        const val EXTRA_APP_NAME = "xyz.self.sdk.APP_NAME"
        const val EXTRA_APP_ENDPOINT = "xyz.self.sdk.APP_ENDPOINT"
        const val EXTRA_RESULT_TYPE = "xyz.self.sdk.RESULT_TYPE"
        const val EXTRA_RESULT_DATA = "xyz.self.sdk.RESULT_DATA"
    }
}
