// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.minipay.screens

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.interop.UIKitView
import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.cinterop.readValue
import kotlinx.serialization.json.Json
import platform.CoreGraphics.CGRectZero
import platform.darwin.NSObject
import platform.WebKit.WKScriptMessage
import platform.WebKit.WKScriptMessageHandlerProtocol
import platform.WebKit.WKUserContentController
import platform.WebKit.WKUserScript
import platform.WebKit.WKUserScriptInjectionTime.WKUserScriptInjectionTimeAtDocumentStart
import platform.WebKit.WKWebView
import platform.WebKit.WKWebViewConfiguration
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

@OptIn(ExperimentalForeignApi::class)
@Composable
actual fun PlatformWebViewBridge(registry: MethodRegistry) {
    UIKitView(
        modifier = Modifier,
        factory = {
            val bridge = IosEthereumBridge(registry)
            val userContentController = WKUserContentController()
            userContentController.addScriptMessageHandler(bridge, ETHEREUM_BRIDGE_CHANNEL)
            userContentController.addUserScript(
                WKUserScript(
                    source = ETHEREUM_BRIDGE_STUB,
                    injectionTime = WKUserScriptInjectionTimeAtDocumentStart,
                    forMainFrameOnly = true,
                ),
            )

            val config = WKWebViewConfiguration()
            config.userContentController = userContentController

            WKWebView(frame = CGRectZero.readValue(), configuration = config).apply {
                bridge.attach(this)
                loadHTMLString(BRIDGE_DEMO_HTML, baseURL = null)
            }
        },
        update = {},
    )
}

@OptIn(ExperimentalForeignApi::class)
private class IosEthereumBridge(
    private val registry: MethodRegistry,
) : NSObject(), WKScriptMessageHandlerProtocol {
    private val pendingRequests = mutableMapOf<String, (ProviderResponse) -> Unit>()
    private var webView: WKWebView? = null

    fun attach(webView: WKWebView) {
        this.webView = webView
    }

    override fun userContentController(
        userContentController: WKUserContentController,
        didReceiveScriptMessage: WKScriptMessage,
    ) {
        val requestJson = didReceiveScriptMessage.body.toString()
        val request =
            try {
                json.decodeFromString<ProviderRequest>(requestJson)
            } catch (_: Exception) {
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
        val responseJson = json.encodeToString(ProviderResponse.serializer(), response)
        val escaped = responseJson.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
        val script = "window.__selfEthereumResolve(\"$escaped\");"
        webView?.evaluateJavaScript(script, completionHandler = null)
    }
}
