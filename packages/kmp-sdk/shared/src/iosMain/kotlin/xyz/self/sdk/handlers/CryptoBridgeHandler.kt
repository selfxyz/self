// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.providers.SdkProviderRegistry

class CryptoBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.CRYPTO

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "sign" -> sign(params)
            "generateKey" -> generateKey(params)
            "getPublicKey" -> getPublicKey(params)
            "deleteKey" -> deleteKey(params)
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown crypto method: $method",
            )
        }

    private fun sign(params: Map<String, JsonElement>): JsonElement {
        val provider =
            SdkProviderRegistry.crypto
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Crypto provider not configured")

        val dataBase64 =
            params["data"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_DATA", "Data parameter required")
        val keyRef =
            params["keyRef"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY_REF", "keyRef parameter required")

        val signature =
            provider.sign(keyRef, dataBase64)
                ?: throw BridgeHandlerException("SIGN_FAILED", "Signing operation failed")

        return buildJsonObject {
            put("signature", signature)
        }
    }

    private fun generateKey(params: Map<String, JsonElement>): JsonElement {
        val provider =
            SdkProviderRegistry.crypto
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Crypto provider not configured")

        val keyRef =
            params["keyRef"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY_REF", "keyRef parameter required")

        provider.generateKey(keyRef)

        return buildJsonObject {
            put("keyRef", keyRef)
            put("success", true)
        }
    }

    private fun getPublicKey(params: Map<String, JsonElement>): JsonElement {
        val provider =
            SdkProviderRegistry.crypto
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Crypto provider not configured")

        val keyRef =
            params["keyRef"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY_REF", "keyRef parameter required")

        val publicKey =
            provider.getPublicKey(keyRef)
                ?: throw BridgeHandlerException("KEY_NOT_FOUND", "Key not found: $keyRef")

        return buildJsonObject {
            put("publicKey", publicKey)
        }
    }

    private fun deleteKey(params: Map<String, JsonElement>): JsonElement? {
        val provider =
            SdkProviderRegistry.crypto
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Crypto provider not configured")

        val keyRef =
            params["keyRef"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY_REF", "keyRef parameter required")

        provider.deleteKey(keyRef)
        return null
    }
}
