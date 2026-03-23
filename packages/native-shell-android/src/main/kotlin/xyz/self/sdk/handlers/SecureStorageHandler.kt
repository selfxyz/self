// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.handlers

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

class SecureStorageHandler(context: Context) : BridgeHandler {
    override val domain = BridgeDomain.SECURE_STORAGE

    private val prefs: SharedPreferences

    // requireBiometric is intentionally ignored — device lock provides sufficient security per spec
    init {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        prefs = EncryptedSharedPreferences.create(
            context,
            "self_sdk_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

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
        val value = prefs.getString(key, null)
        return if (value != null) JsonPrimitive(value) else JsonNull
    }

    private fun set(params: Map<String, JsonElement>): JsonElement? {
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        val value = params["value"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_VALUE", "Value parameter required")
        prefs.edit().putString(key, value).apply()
        return null
    }

    private fun remove(params: Map<String, JsonElement>): JsonElement? {
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")
        prefs.edit().remove(key).apply()
        return null
    }
}
