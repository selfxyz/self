// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import kotlinx.serialization.json.JsonElement

/**
 * Interface that native bridge implementations must conform to.
 *
 * Each [BridgeDomain] has one or more handlers registered in the [MessageRouter].
 * When a request arrives from the WebView, the router dispatches it to the
 * appropriate handler based on the domain.
 */
interface BridgeHandler {
    /** The domain this handler services. */
    val domain: BridgeDomain

    /**
     * Handle an incoming request from the WebView.
     *
     * @param method The method name (e.g. "scan", "authenticate", "get")
     * @param params The request parameters as a JSON map
     * @return The result to send back (will be wrapped in a success response)
     * @throws BridgeHandlerException on failure (will be wrapped in an error response)
     */
    suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement?
}

/**
 * Exception thrown by bridge handlers to indicate a domain-specific error.
 * The [code] and [message] are forwarded to the WebView as a [BridgeError].
 */
class BridgeHandlerException(
    val code: String,
    override val message: String,
    val details: Map<String, JsonElement>? = null,
) : Exception(message)
