// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.providers.SdkProviderRegistry

class HapticBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.HAPTIC

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "trigger" -> trigger(params)
            "isAvailable" -> isAvailable()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown haptic method: $method",
            )
        }

    private fun trigger(params: Map<String, JsonElement>): JsonElement? {
        val provider = SdkProviderRegistry.haptic ?: return null
        val type = params["type"]?.jsonPrimitive?.content ?: "medium"
        provider.trigger(type)
        return null
    }

    private fun isAvailable(): JsonElement {
        val provider = SdkProviderRegistry.haptic ?: return JsonPrimitive(false)
        return JsonPrimitive(provider.isAvailable())
    }
}
