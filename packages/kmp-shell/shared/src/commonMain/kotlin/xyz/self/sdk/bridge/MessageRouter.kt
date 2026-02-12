// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive

/**
 * Routes incoming bridge messages from the WebView to registered [BridgeHandler]s
 * and sends responses back.
 *
 * The router runs handlers on a coroutine scope so long-running operations
 * (like NFC scanning) don't block the main thread.
 *
 * @param sendToWebView Callback to deliver JSON response strings to the WebView.
 *   On Android this calls `evaluateJavascript`, on iOS `evaluateJavaScript`.
 */
class MessageRouter(
    private val sendToWebView: (String) -> Unit,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
) {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private val handlers = mutableMapOf<BridgeDomain, BridgeHandler>()

    /** Register a handler for a domain. Replaces any existing handler. */
    fun register(handler: BridgeHandler) {
        handlers[handler.domain] = handler
    }

    /** Unregister a handler for a domain. */
    fun unregister(domain: BridgeDomain) {
        handlers.remove(domain)
    }

    /**
     * Called when a raw JSON message arrives from the WebView.
     * Parses the request, dispatches to the handler, and sends the response.
     */
    fun onMessageReceived(rawJson: String) {
        val request: BridgeRequest
        try {
            request = json.decodeFromString<BridgeRequest>(rawJson)
        } catch (e: Exception) {
            // Cannot parse — cannot respond (no requestId)
            return
        }

        if (request.type != "request") return

        val handler = handlers[request.domain]
        if (handler == null) {
            sendResponse(
                request,
                success = false,
                error = BridgeError(
                    code = "DOMAIN_NOT_REGISTERED",
                    message = "No handler registered for domain: ${request.domain}",
                ),
            )
            return
        }

        scope.launch {
            try {
                val result = handler.handle(request.method, request.params)
                sendResponse(request, success = true, data = result)
            } catch (e: BridgeHandlerException) {
                sendResponse(
                    request,
                    success = false,
                    error = BridgeError(
                        code = e.code,
                        message = e.message,
                        details = e.details,
                    ),
                )
            } catch (e: Exception) {
                sendResponse(
                    request,
                    success = false,
                    error = BridgeError(
                        code = "NATIVE_ERROR",
                        message = e.message ?: "Unknown native error",
                    ),
                )
            }
        }
    }

    /**
     * Push an unsolicited event to the WebView.
     * Use this for streaming updates like NFC scan progress.
     */
    fun pushEvent(domain: BridgeDomain, event: String, data: JsonElement) {
        val bridgeEvent = BridgeEvent(
            id = generateUuid(),
            domain = domain,
            event = event,
            data = data,
        )

        val eventJson = json.encodeToString(bridgeEvent)
        val js = "window.SelfNativeBridge._handleEvent(${escapeForJs(eventJson)})"
        sendToWebView(js)
    }

    private fun sendResponse(
        request: BridgeRequest,
        success: Boolean,
        data: JsonElement? = null,
        error: BridgeError? = null,
    ) {
        val response = BridgeResponse(
            id = generateUuid(),
            domain = request.domain,
            requestId = request.id,
            success = success,
            data = data ?: if (success) JsonNull else null,
            error = error,
        )

        val responseJson = json.encodeToString(response)
        val js = "window.SelfNativeBridge._handleResponse(${escapeForJs(responseJson)})"
        sendToWebView(js)
    }

    companion object {
        /** Escape a JSON string for safe embedding in JavaScript. */
        fun escapeForJs(json: String): String {
            // Wrap in single quotes after escaping existing single quotes and backslashes
            val escaped = json
                .replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
            return "'$escaped'"
        }
    }
}
