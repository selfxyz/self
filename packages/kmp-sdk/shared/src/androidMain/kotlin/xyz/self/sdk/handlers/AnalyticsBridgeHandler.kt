// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import android.util.Log
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * Android implementation of analytics bridge handler.
 * Logs events to Logcat. Host apps can forward these to their analytics providers.
 * Fire-and-forget operation - no PII should be logged.
 */
class AnalyticsBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.ANALYTICS

    companion object {
        private const val TAG = "SelfSDK-Analytics"
    }

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

    /**
     * Tracks a general analytics event.
     * Logs to Logcat for debugging. Host apps can intercept and forward to their analytics.
     */
    private fun trackEvent(params: Map<String, JsonElement>): JsonElement? {
        val eventName = params["event"]?.jsonPrimitive?.content ?: "unknown_event"
        val properties = params["properties"]?.toString() ?: "{}"

        Log.i(TAG, "Event: $eventName, Properties: $properties")

        return null // Fire-and-forget
    }

    /**
     * Tracks an NFC-specific event.
     * Used for monitoring NFC scan progress and success/failure rates.
     */
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

        Log.i(TAG, logMessage)

        return null // Fire-and-forget
    }

    /**
     * Logs an NFC-specific event for debugging.
     * Lower level than trackNfcEvent - used for detailed debugging.
     */
    private fun logNfcEvent(params: Map<String, JsonElement>): JsonElement? {
        val message = params["message"]?.jsonPrimitive?.content ?: "NFC log event"
        val level = params["level"]?.jsonPrimitive?.content ?: "info"

        when (level.lowercase()) {
            "debug" -> Log.d(TAG, "NFC: $message")
            "info" -> Log.i(TAG, "NFC: $message")
            "warn" -> Log.w(TAG, "NFC: $message")
            "error" -> Log.e(TAG, "NFC: $message")
            else -> Log.i(TAG, "NFC: $message")
        }

        return null // Fire-and-forget
    }
}
