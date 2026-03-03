// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.providers.SdkProviderRegistry
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class CameraMrzBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.CAMERA

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "scanMRZ" -> scanMRZ()
            "isAvailable" -> isAvailable()
            "stopCamera" -> stopCamera()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown camera method: $method",
            )
        }

    private suspend fun scanMRZ(): JsonElement =
        suspendCancellableCoroutine { continuation ->
            val provider = SdkProviderRegistry.cameraMrz
            if (provider == null) {
                continuation.resumeWithException(
                    BridgeHandlerException("NOT_CONFIGURED", "CameraMrz provider not configured"),
                )
                return@suspendCancellableCoroutine
            }

            provider.createCameraView(
                onMrzDetected = { jsonString ->
                    if (continuation.isActive) {
                        try {
                            val jsonElement = Json.parseToJsonElement(jsonString)
                            continuation.resume(jsonElement)
                        } catch (e: Exception) {
                            continuation.resumeWithException(
                                BridgeHandlerException("PARSE_ERROR", "Failed to parse MRZ result: ${e.message}"),
                            )
                        }
                    }
                },
                onProgress = { /* Progress handled by the view */ },
                onError = { error ->
                    if (continuation.isActive) {
                        continuation.resumeWithException(
                            BridgeHandlerException("CAMERA_ERROR", error),
                        )
                    }
                },
            )

            continuation.invokeOnCancellation {
                provider.stopCamera()
            }
        }

    private fun isAvailable(): JsonElement {
        val provider = SdkProviderRegistry.cameraMrz ?: return JsonPrimitive(false)
        return JsonPrimitive(provider.isAvailable())
    }

    private fun stopCamera(): JsonElement? {
        SdkProviderRegistry.cameraMrz?.stopCamera()
        return null
    }
}
