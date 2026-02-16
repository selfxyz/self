// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.providers.SdkProviderRegistry
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class BiometricBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.BIOMETRICS

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "authenticate" -> authenticate(params)
            "isAvailable" -> isAvailable()
            "getBiometryType" -> getBiometryType()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown biometrics method: $method",
            )
        }

    private suspend fun authenticate(params: Map<String, JsonElement>): JsonElement {
        val provider =
            SdkProviderRegistry.biometric
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Biometric provider not configured")

        val reason = params["reason"]?.jsonPrimitive?.content ?: "Authenticate to continue"

        return suspendCancellableCoroutine { continuation ->
            provider.authenticate(
                reason = reason,
                onSuccess = {
                    if (continuation.isActive) {
                        continuation.resume(JsonPrimitive(true))
                    }
                },
                onError = { errorMessage ->
                    if (continuation.isActive) {
                        continuation.resumeWithException(
                            BridgeHandlerException(
                                "BIOMETRIC_ERROR",
                                errorMessage,
                            ),
                        )
                    }
                },
            )
        }
    }

    private fun isAvailable(): JsonElement {
        val provider = SdkProviderRegistry.biometric ?: return JsonPrimitive(false)
        return JsonPrimitive(provider.isAvailable())
    }

    private fun getBiometryType(): JsonElement {
        val provider = SdkProviderRegistry.biometric ?: return JsonPrimitive("none")
        return JsonPrimitive(provider.getBiometryType())
    }
}
