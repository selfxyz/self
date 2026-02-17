// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
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
        val eventName = params.stringParam("event") ?: "unknown_event"
        NSLog("SelfSDK-Analytics: Event: %@", eventName)
        return null
    }

    private fun trackNfcEvent(params: Map<String, JsonElement>): JsonElement? {
        val eventName = params.stringParam("event") ?: "nfc_event"
        val step = params.stringParam("step") ?: "unknown"
        val success = params.stringParam("success")?.toBoolean()
        val errorCode = params.stringParam("errorCode")

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
        val message = params.stringParam("message") ?: "NFC log event"
        val level = params.stringParam("level") ?: "info"
        NSLog("SelfSDK-Analytics [%@]: NFC: %@", level, message)
        return null
    }
}

/** Safely extract a string param, returning null if key is missing or value is not a primitive. */
private fun Map<String, JsonElement>.stringParam(key: String): String? = (this[key] as? JsonPrimitive)?.content
