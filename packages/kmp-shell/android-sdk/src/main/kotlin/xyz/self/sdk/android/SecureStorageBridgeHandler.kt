// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.android

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * Bridge handler for secure key-value storage on Android.
 *
 * Uses AndroidX Security Crypto's [EncryptedSharedPreferences] backed by
 * an AES-256-GCM master key stored in the Android Keystore. This ensures
 * all values are encrypted at rest.
 *
 * Supports methods: "get", "set", "remove".
 *
 * @param context Application context used to initialize encrypted prefs.
 */
class SecureStorageBridgeHandler(
    context: Context,
) : BridgeHandler {

    override val domain = BridgeDomain.SECURE_STORAGE

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        PREFS_FILE_NAME,
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        val key = params["key"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PARAM", "key is required")

        return when (method) {
            "get" -> {
                val value = prefs.getString(key, null)
                if (value != null) JsonPrimitive(value) else JsonNull
            }
            "set" -> {
                val value = params["value"]?.jsonPrimitive?.content
                    ?: throw BridgeHandlerException("MISSING_PARAM", "value is required")
                prefs.edit().putString(key, value).apply()
                buildJsonObject { put("success", true) }
            }
            "remove" -> {
                prefs.edit().remove(key).apply()
                buildJsonObject { put("success", true) }
            }
            "has" -> {
                buildJsonObject { put("exists", prefs.contains(key)) }
            }
            else -> throw BridgeHandlerException(
                "UNKNOWN_METHOD",
                "Unknown secureStorage method: $method",
            )
        }
    }

    companion object {
        private const val PREFS_FILE_NAME = "self_sdk_secure_storage"
    }
}
