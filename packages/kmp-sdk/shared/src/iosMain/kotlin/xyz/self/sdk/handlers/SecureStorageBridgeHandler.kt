// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.providers.SdkProviderRegistry

class SecureStorageBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.SECURE_STORAGE

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "get" -> get(params)
            "set" -> set(params)
            "remove" -> remove(params)
            "clear" -> clear()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown secureStorage method: $method",
            )
        }

    private fun get(params: Map<String, JsonElement>): JsonElement {
        val provider =
            SdkProviderRegistry.secureStorage
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not configured")

        val key =
            params["key"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")

        val value = provider.get(key)
        return if (value != null) JsonPrimitive(value) else JsonNull
    }

    private fun set(params: Map<String, JsonElement>): JsonElement? {
        val provider =
            SdkProviderRegistry.secureStorage
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not configured")

        val key =
            params["key"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        val value =
            params["value"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_VALUE", "Value parameter required")

        provider.set(key, value)
        return null
    }

    private fun remove(params: Map<String, JsonElement>): JsonElement? {
        val provider =
            SdkProviderRegistry.secureStorage
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not configured")

        val key =
            params["key"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")

        provider.remove(key)
        return null
    }

    private fun clear(): JsonElement? {
        val provider =
            SdkProviderRegistry.secureStorage
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "SecureStorage provider not configured")

        provider.clear()
        return null
    }
}
