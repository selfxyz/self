// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.api.SecureStorageProvider
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

class SecureStorageHandler(private val provider: SecureStorageProvider) : BridgeHandler {
    override val domain = BridgeDomain.SECURE_STORAGE

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? = when (method) {
        "get" -> get(params)
        "set" -> set(params)
        "remove" -> remove(params)
        else -> throw BridgeHandlerException("METHOD_NOT_FOUND", "Unknown secureStorage method: $method")
    }

    private fun get(params: Map<String, JsonElement>): JsonElement {
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        val value = provider.get(key)
        return buildJsonObject {
            put("value", if (value != null) JsonPrimitive(value) else JsonNull)
        }
    }

    private fun set(params: Map<String, JsonElement>): JsonElement? {
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        val value = params["value"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_VALUE", "Value parameter required")
        provider.set(key, value)
        return null
    }

    private fun remove(params: Map<String, JsonElement>): JsonElement? {
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        provider.remove(key)
        return null
    }
}
