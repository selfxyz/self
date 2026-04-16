// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.bridge

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement

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
        isTrustedSource: Boolean,
    ) {
        if (!isTrustedSource) {
            return // Drop messages from untrusted WebView origins.
        }

        val request =
            try {
                json.decodeFromString<BridgeRequest>(rawJson)
            } catch (e: Exception) {
                return // Malformed message — drop silently
            }

        if (request.version != BRIDGE_PROTOCOL_VERSION) {
            sendResponse(
                BridgeResponse(
                    id = generateUuid(),
                    domain = request.domain,
                    requestId = request.id,
                    success = false,
                    error =
                        BridgeError(
                            code = "UNSUPPORTED_VERSION",
                            message = "Expected protocol version $BRIDGE_PROTOCOL_VERSION, got ${request.version}",
                        ),
                ),
            )
            return
        }

        val handler = handlers[request.domain]
        if (handler == null) {
            sendResponse(
                BridgeResponse(
                    id = generateUuid(),
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
                        id = generateUuid(),
                        domain = request.domain,
                        requestId = request.id,
                        success = true,
                        data = result,
                    ),
                )
            } catch (e: BridgeHandlerException) {
                sendResponse(
                    BridgeResponse(
                        id = generateUuid(),
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
                        id = generateUuid(),
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
                id = generateUuid(),
                domain = domain,
                event = event,
                data = data,
            )
        val eventJson = json.encodeToString(bridgeEvent)
        sendToWebView("window.SelfNativeBridge._handleEvent(${escapeForJs(eventJson)})")
    }

    private fun sendResponse(response: BridgeResponse) {
        val responseJson = json.encodeToString(response)
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
                    .replace("\u2028", "\\u2028") // Line separator
                    .replace("\u2029", "\\u2029") // Paragraph separator
            return "'$escaped'"
        }
    }
}
