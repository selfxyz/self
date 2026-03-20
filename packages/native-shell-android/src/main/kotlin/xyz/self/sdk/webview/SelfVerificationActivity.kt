// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import android.os.Bundle
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
        val teeUrl = intent.getStringExtra(EXTRA_TEE_URL) ?: ""
        val verificationId = intent.getStringExtra(EXTRA_VERIFICATION_ID) ?: ""
        val userId = intent.getStringExtra(EXTRA_USER_ID) ?: ""

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
            append("teeUrl=").append(android.net.Uri.encode(teeUrl))
            append("&verificationId=").append(android.net.Uri.encode(verificationId))
            append("&userId=").append(android.net.Uri.encode(userId))
        }

        val webView = webViewHost.createWebView(queryParams)
        setContentView(webView)
    }

    override fun onDestroy() {
        if (::webViewHost.isInitialized) {
            webViewHost.destroy()
        }
        super.onDestroy()
    }

    companion object {
        const val EXTRA_DEBUG_MODE = "xyz.self.sdk.DEBUG_MODE"
        const val EXTRA_TEE_URL = "xyz.self.sdk.TEE_URL"
        const val EXTRA_VERIFICATION_ID = "xyz.self.sdk.VERIFICATION_ID"
        const val EXTRA_USER_ID = "xyz.self.sdk.USER_ID"
        const val EXTRA_RESULT_DATA = "xyz.self.sdk.RESULT_DATA"
    }
}
