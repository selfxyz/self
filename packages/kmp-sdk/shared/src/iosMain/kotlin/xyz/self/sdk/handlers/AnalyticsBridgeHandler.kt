// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive
import platform.Foundation.NSLog
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

class AnalyticsBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.ANALYTICS

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "trackEvent" -> trackEvent(params)
            "trackNfcEvent" -> trackNfcEvent(params)
            "logNfcEvent" -> logNfcEvent(params)
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown analytics method: $method",
            )
        }

    private fun trackEvent(params: Map<String, JsonElement>): JsonElement? {
        val eventName = params["event"]?.jsonPrimitive?.content ?: "unknown_event"
        NSLog("SelfSDK-Analytics: Event: %@", eventName)
        return null
    }

    private fun trackNfcEvent(params: Map<String, JsonElement>): JsonElement? {
        val eventName = params["event"]?.jsonPrimitive?.content ?: "nfc_event"
        val step = params["step"]?.jsonPrimitive?.content ?: "unknown"
        val success = params["success"]?.jsonPrimitive?.content?.toBoolean()
        val errorCode = params["errorCode"]?.jsonPrimitive?.content

        val logMessage =
            buildString {
                append("NFC Event: $eventName")
                append(", Step: $step")
                if (success != null) append(", Success: $success")
                if (errorCode != null) append(", Error: $errorCode")
            }

        NSLog("SelfSDK-Analytics: %@", logMessage)
        return null
    }

    private fun logNfcEvent(params: Map<String, JsonElement>): JsonElement? {
        val message = params["message"]?.jsonPrimitive?.content ?: "NFC log event"
        val level = params["level"]?.jsonPrimitive?.content ?: "info"
        NSLog("SelfSDK-Analytics [%@]: NFC: %@", level, message)
        return null
    }
}
