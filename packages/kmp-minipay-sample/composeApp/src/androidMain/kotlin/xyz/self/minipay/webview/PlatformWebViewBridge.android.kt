// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay.screens

import android.annotation.SuppressLint
import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import kotlinx.serialization.json.Json
import org.json.JSONObject
import xyz.self.minipay.webview.BRIDGE_DEMO_HTML
import xyz.self.minipay.webview.BridgeMethodException
import xyz.self.minipay.webview.ETHEREUM_BRIDGE_CHANNEL
import xyz.self.minipay.webview.ETHEREUM_BRIDGE_STUB
import xyz.self.minipay.webview.MethodRegistry
import xyz.self.minipay.webview.ProviderError
import xyz.self.minipay.webview.ProviderErrorCodes
import xyz.self.minipay.webview.ProviderRequest
import xyz.self.minipay.webview.ProviderResponse

private val json = Json { ignoreUnknownKeys = true }

@Composable
actual fun PlatformWebViewBridge(registry: MethodRegistry) {
    AndroidView(
        modifier = Modifier,
        factory = { context -> createWebView(context = context, registry = registry) },
    )
}

@SuppressLint("SetJavaScriptEnabled")
private fun createWebView(
    context: Context,
    registry: MethodRegistry,
): WebView {
    val bridge = AndroidEthereumBridge(registry)

    return WebView(context).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        webViewClient =
            object : WebViewClient() {
                override fun onPageFinished(
                    view: WebView,
                    url: String?,
                ) {
                    view.evaluateJavascript(ETHEREUM_BRIDGE_STUB, null)
                }
            }
        addJavascriptInterface(bridge, ETHEREUM_BRIDGE_CHANNEL)
        bridge.attach(this)
        loadDataWithBaseURL("https://localhost/", BRIDGE_DEMO_HTML, "text/html", "utf-8", null)
    }
}

private class AndroidEthereumBridge(
    private val registry: MethodRegistry,
) {
    private val pendingRequests = mutableMapOf<String, (ProviderResponse) -> Unit>()
    private var webView: WebView? = null

    fun attach(webView: WebView) {
        this.webView = webView
    }

    @JavascriptInterface
    fun postMessage(requestJson: String) {
        val request =
            try {
                json.decodeFromString<ProviderRequest>(requestJson)
            } catch (_: Exception) {
                val fallbackId = requestJson.substringAfter("\"id\":\"", "").substringBefore("\"", "")
                if (fallbackId.isNotEmpty()) {
                    respond(
                        ProviderResponse(
                            id = fallbackId,
                            error =
                                ProviderError(
                                    code = ProviderErrorCodes.INVALID_PARAMS,
                                    message = "Invalid request payload",
                                ),
                        ),
                    )
                }
                return
            }

        pendingRequests[request.id] = { response -> sendResponseToJs(response) }

        val response =
            try {
                registry.dispatch(request)
            } catch (exception: BridgeMethodException) {
                ProviderResponse(id = request.id, error = exception.providerError)
            } catch (exception: Exception) {
                ProviderResponse(
                    id = request.id,
                    error =
                        ProviderError(
                            code = ProviderErrorCodes.INTERNAL_ERROR,
                            message = exception.message ?: "Internal error",
                        ),
                )
            }

        respond(response)
    }

    private fun respond(response: ProviderResponse) {
        val callback = pendingRequests.remove(response.id) ?: return
        callback(response)
    }

    private fun sendResponseToJs(response: ProviderResponse) {
        val payload = json.encodeToString(ProviderResponse.serializer(), response)
        val escaped = JSONObject.quote(payload)
        webView?.post {
            webView?.evaluateJavascript("window.__selfEthereumResolve($escaped);", null)
        }
    }
}
