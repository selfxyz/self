// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.handlers.BiometricBridgeHandler
import xyz.self.sdk.handlers.CameraMrzBridgeHandler
import xyz.self.sdk.handlers.LifecycleBridgeHandler
import xyz.self.sdk.handlers.NfcBridgeHandler
import xyz.self.sdk.handlers.SecureStorageBridgeHandler

/**
 * Activity that hosts the Self verification WebView.
 * This is the main entry point for the verification flow.
 * Host apps launch this Activity via SelfSdk.launch().
 */
class SelfVerificationActivity : AppCompatActivity() {
    private lateinit var webViewHost: AndroidWebViewHost
    private lateinit var router: MessageRouter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Determine if we're in debug mode
        val isDebugMode = intent.getBooleanExtra(EXTRA_DEBUG_MODE, false)

        // Create router with callback to send JavaScript to WebView
        router =
            MessageRouter(
                sendToWebView = { js ->
                    // Ensure we're on the UI thread
                    runOnUiThread {
                        webViewHost.evaluateJs(js)
                    }
                },
            )

        // Register all native bridge handlers
        // These handlers implement the bridge protocol domains
        registerHandlers()

        // Create and display WebView
        webViewHost = AndroidWebViewHost(this, router, isDebugMode)
        val webView = webViewHost.createWebView()
        setContentView(webView)
    }

    /**
     * Registers all bridge handlers with the MessageRouter.
     * Each handler implements a specific domain of the bridge protocol.
     */
    private fun registerHandlers() {
        // NFC - Passport scanning
        router.register(NfcBridgeHandler(this, router))

        // Camera - MRZ scanning
        router.register(CameraMrzBridgeHandler(this))

        // Biometrics - Fingerprint/Face authentication
        router.register(BiometricBridgeHandler(this))

        // Secure Storage - Encrypted key-value storage
        router.register(SecureStorageBridgeHandler(this))

        // Lifecycle - WebView lifecycle management
        router.register(LifecycleBridgeHandler(this))
    }

    override fun onDestroy() {
        webViewHost.destroy()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_DEBUG_MODE = "xyz.self.sdk.DEBUG_MODE"
        const val EXTRA_VERIFICATION_REQUEST = "xyz.self.sdk.VERIFICATION_REQUEST"
        const val EXTRA_CONFIG = "xyz.self.sdk.CONFIG"

        // Activity result codes
        const val RESULT_CODE_SUCCESS = RESULT_OK
        const val RESULT_CODE_ERROR = RESULT_FIRST_USER
        const val RESULT_CODE_CANCELLED = RESULT_CANCELED

        // Result extras
        const val EXTRA_RESULT_DATA = "xyz.self.sdk.RESULT_DATA"
        const val EXTRA_ERROR_CODE = "xyz.self.sdk.ERROR_CODE"
        const val EXTRA_ERROR_MESSAGE = "xyz.self.sdk.ERROR_MESSAGE"
    }
}
