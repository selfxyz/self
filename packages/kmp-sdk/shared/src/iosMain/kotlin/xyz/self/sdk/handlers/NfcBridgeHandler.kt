// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.bridge.MessageRouter
import xyz.self.sdk.models.NfcScanProgress
import xyz.self.sdk.models.NfcScanState
import xyz.self.sdk.providers.SdkProviderRegistry
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class NfcBridgeHandler(
    private val router: MessageRouter,
) : BridgeHandler {
    override val domain = BridgeDomain.NFC

    private val json = Json { ignoreUnknownKeys = true }

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "scan" -> scan(params)
            "cancelScan" -> cancelScan()
            "isSupported" -> isSupported()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown NFC method: $method",
            )
        }

    private suspend fun scan(params: Map<String, JsonElement>): JsonElement {
        val provider =
            SdkProviderRegistry.nfc
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "NFC provider not configured")

        val passportNumber =
            params["passportNumber"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_PASSPORT_NUMBER", "Passport number required")
        val dateOfBirth =
            params["dateOfBirth"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_DOB", "Date of birth required")
        val dateOfExpiry =
            params["dateOfExpiry"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_EXPIRY", "Date of expiry required")

        return suspendCancellableCoroutine { continuation ->
            provider.scanPassport(
                passportNumber = passportNumber,
                dateOfBirth = dateOfBirth,
                dateOfExpiry = dateOfExpiry,
                onProgress = { progressAny ->
                    // progressAny is a state index (Int) from Swift
                    val stateIndex =
                        when (progressAny) {
                            is Number -> progressAny.toInt()
                            else -> 0
                        }
                    val state = NfcScanState.entries.getOrNull(stateIndex)
                    val stepName = state?.name?.lowercase() ?: "unknown"
                    val percent = state?.percent ?: 0
                    val progress = NfcScanProgress(stepName, percent, state?.message)
                    val progressElement = json.encodeToJsonElement(NfcScanProgress.serializer(), progress)
                    router.pushEvent(BridgeDomain.NFC, "scanProgress", progressElement)
                },
                onComplete = { resultJson ->
                    if (continuation.isActive) {
                        try {
                            val jsonElement = json.parseToJsonElement(resultJson)
                            continuation.resume(jsonElement)
                        } catch (e: Exception) {
                            continuation.resumeWithException(
                                BridgeHandlerException("PARSE_ERROR", "Failed to parse NFC result: ${e.message}"),
                            )
                        }
                    }
                },
                onError = { error ->
                    if (continuation.isActive) {
                        continuation.resumeWithException(
                            BridgeHandlerException("NFC_SCAN_FAILED", error),
                        )
                    }
                },
            )

            continuation.invokeOnCancellation {
                provider.cancelScan()
            }
        }
    }

    private fun cancelScan(): JsonElement? {
        SdkProviderRegistry.nfc?.cancelScan()
        return null
    }

    private fun isSupported(): JsonElement {
        val provider = SdkProviderRegistry.nfc ?: return JsonPrimitive(false)
        return JsonPrimitive(provider.isAvailable())
    }
}
