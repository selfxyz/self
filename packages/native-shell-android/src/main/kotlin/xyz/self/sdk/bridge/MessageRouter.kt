// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import java.util.UUID

class MessageRouter(
    private val sendToWebView: (js: String) -> Unit,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
) {
    private val handlers = mutableMapOf<BridgeDomain, BridgeHandler>()
    private val json =
        Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        }

    fun register(handler: BridgeHandler) {
        handlers[handler.domain] = handler
    }

    fun onMessageReceived(
        rawJson: String,
        isTrustedSource: Boolean = true,
    ) {
        if (!isTrustedSource) {
            android.util.Log.w("BridgeRouter", "Dropped message from untrusted WebView origin")
            return
        }

        val request =
            try {
                json.decodeFromString<BridgeRequest>(rawJson)
            } catch (e: Exception) {
                android.util.Log.e("BridgeRouter", "Failed to decode request: ${e::class.simpleName}")
                return
            }
        android.util.Log.d("BridgeRouter", "Received: domain=${request.domain} method=${request.method}")

        if (request.version != BRIDGE_PROTOCOL_VERSION) {
            sendResponse(
                BridgeResponse(
                    id = UUID.randomUUID().toString(),
                    domain = request.domain,
                    requestId = request.id,
                    success = false,
                    error =
                        BridgeError(
                            code = "UNSUPPORTED_VERSION",
                            message = "Protocol version ${request.version} is not supported",
                        ),
                ),
            )
            return
        }

        val handler = handlers[request.domain]
        if (handler == null) {
            sendResponse(
                BridgeResponse(
                    id = UUID.randomUUID().toString(),
                    domain = request.domain,
                    requestId = request.id,
                    success = false,
                    error =
                        BridgeError(
                            code = "DOMAIN_NOT_FOUND",
                            message = "No handler registered for domain: ${request.domain}",
                        ),
                ),
            )
            return
        }

        scope.launch {
            try {
                val result = handler.handle(request.method, request.params)
                sendResponse(
                    BridgeResponse(
                        id = UUID.randomUUID().toString(),
                        domain = request.domain,
                        requestId = request.id,
                        success = true,
                        data = result,
                    ),
                )
            } catch (e: BridgeHandlerException) {
                sendResponse(
                    BridgeResponse(
                        id = UUID.randomUUID().toString(),
                        domain = request.domain,
                        requestId = request.id,
                        success = false,
                        error =
                            BridgeError(
                                code = e.code,
                                message = e.message,
                                details = e.details,
                            ),
                    ),
                )
            } catch (e: Exception) {
                sendResponse(
                    BridgeResponse(
                        id = UUID.randomUUID().toString(),
                        domain = request.domain,
                        requestId = request.id,
                        success = false,
                        error =
                            BridgeError(
                                code = "INTERNAL_ERROR",
                                message = e.message ?: "Unknown error",
                            ),
                    ),
                )
            }
        }
    }

    fun pushEvent(
        domain: BridgeDomain,
        event: String,
        data: JsonElement,
    ) {
        val bridgeEvent =
            BridgeEvent(
                id = UUID.randomUUID().toString(),
                domain = domain,
                event = event,
                data = data,
            )
        val eventJson = json.encodeToString(bridgeEvent)
        sendToWebView("window.SelfNativeBridge._handleEvent(${escapeForJs(eventJson)})")
    }

    private fun sendResponse(response: BridgeResponse) {
        val responseJson = json.encodeToString(response)
        android.util.Log.d("BridgeRouter", "Sending response: domain=${response.domain} success=${response.success}")
        sendToWebView("window.SelfNativeBridge._handleResponse(${escapeForJs(responseJson)})")
    }

    companion object {
        fun escapeForJs(jsonStr: String): String {
            val escaped =
                jsonStr
                    .replace("\\", "\\\\")
                    .replace("'", "\\'")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\u2028", "\\u2028")
                    .replace("\u2029", "\\u2029")
            return "'$escaped'"
        }
    }
}
