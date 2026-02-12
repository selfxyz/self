// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.android

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.fragment.app.Fragment
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.MessageRouter

/**
 * Fragment that hosts the Self SDK WebView and injects the native bridge
 * JavaScript interface.
 *
 * Use [newInstance] to create with optional dev-mode configuration.
 * Register native [BridgeHandler]s via [registerHandler] to handle
 * messages from the WebView.
 */
class SelfWebViewFragment : Fragment() {

    private var webView: WebView? = null
    private lateinit var router: MessageRouter
    private var devMode = false
    private var devServerUrl = DEFAULT_DEV_SERVER_URL

    companion object {
        private const val ARG_DEV_MODE = "dev_mode"
        private const val ARG_DEV_URL = "dev_url"
        private const val ASSETS_PATH = "file:///android_asset/self-wallet/index.html"
        private const val DEFAULT_DEV_SERVER_URL = "http://10.0.2.2:5173"

        fun newInstance(
            devMode: Boolean = false,
            devServerUrl: String? = null,
        ): SelfWebViewFragment {
            return SelfWebViewFragment().apply {
                arguments = Bundle().apply {
                    putBoolean(ARG_DEV_MODE, devMode)
                    devServerUrl?.let { putString(ARG_DEV_URL, it) }
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        devMode = arguments?.getBoolean(ARG_DEV_MODE, false) ?: false
        arguments?.getString(ARG_DEV_URL)?.let { devServerUrl = it }

        router = MessageRouter(
            sendToWebView = { js ->
                webView?.post { webView?.evaluateJavascript(js, null) }
            }
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View {
        webView = WebView(requireContext()).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                setSupportMultipleWindows(false)
                mediaPlaybackRequiresUserGesture = false
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }

            addJavascriptInterface(BridgeInterface(), "SelfNativeAndroid")

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    view?.evaluateJavascript(BRIDGE_BOOTSTRAP_JS, null)
                }
            }
        }

        return webView!!
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        loadContent()
    }

    private fun loadContent() {
        if (devMode) {
            webView?.loadUrl(devServerUrl)
        } else {
            webView?.loadUrl(ASSETS_PATH)
        }
    }

    /** Returns the [MessageRouter] used by this fragment. */
    fun getRouter(): MessageRouter = router

    /** Register a [BridgeHandler] to handle messages for its domain. */
    fun registerHandler(handler: BridgeHandler) {
        router.register(handler)
    }

    /** Unregister the handler for a given [BridgeDomain]. */
    fun unregisterHandler(domain: BridgeDomain) {
        router.unregister(domain)
    }

    override fun onDestroyView() {
        webView?.destroy()
        webView = null
        super.onDestroyView()
    }

    /**
     * JavaScript interface exposed to the WebView as `window.SelfNativeAndroid`.
     * The WebView calls `postMessage(json)` which routes through the [MessageRouter].
     */
    inner class BridgeInterface {
        @JavascriptInterface
        fun postMessage(message: String) {
            router.onMessageReceived(message)
        }
    }
}

/**
 * Bootstrap JavaScript injected after page load.
 *
 * Sets up `window.SelfNativeBridge` with response/event handler stubs
 * and wires `postMessage` through the Android `SelfNativeAndroid` interface.
 */
private const val BRIDGE_BOOTSTRAP_JS = """
(function() {
    if (window.SelfNativeBridge) return;
    window.SelfNativeBridge = {
        postMessage: function(json) {
            if (window.SelfNativeAndroid) {
                window.SelfNativeAndroid.postMessage(json);
            }
        },
        _handleResponse: function(json) {},
        _handleEvent: function(json) {}
    };
    if (window.SelfNativeAndroid) {
        console.log('[SelfBridge] Android native bridge detected');
    }
})();
"""
