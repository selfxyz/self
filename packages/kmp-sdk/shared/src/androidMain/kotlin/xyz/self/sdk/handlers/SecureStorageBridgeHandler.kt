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

/**
 * Android implementation of secure storage bridge handler.
 * Uses EncryptedSharedPreferences backed by Android Keystore for secure key-value storage.
 */
class SecureStorageBridgeHandler(
    context: Context,
) : BridgeHandler {
    override val domain = BridgeDomain.SECURE_STORAGE

    private val prefs: SharedPreferences

    init {
        // Create master key for encryption
        val masterKey =
            MasterKey
                .Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

        // Create encrypted shared preferences
        prefs =
            EncryptedSharedPreferences.create(
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

    /**
     * Retrieves a value from secure storage.
     * Returns the value as a string, or null if the key doesn't exist.
     */
    private fun get(params: Map<String, JsonElement>): JsonElement {
        val key =
            params["key"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")

        val value = prefs.getString(key, null)

        return if (value != null) {
            JsonPrimitive(value)
        } else {
            JsonNull
        }
    }

    /**
     * Stores a value in secure storage.
     * The value is encrypted using Android Keystore.
     */
    private fun set(params: Map<String, JsonElement>): JsonElement? {
        val key =
            params["key"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")

        val value =
            params["value"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_VALUE", "Value parameter required")

        prefs.edit().putString(key, value).apply()

        return null // Success with no return value
    }

    /**
     * Removes a value from secure storage.
     */
    private fun remove(params: Map<String, JsonElement>): JsonElement? {
        val key =
            params["key"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_KEY", "Key parameter required")

        prefs.edit().remove(key).apply()

        return null // Success with no return value
    }

    /**
     * Clears all values from secure storage.
     */
    private fun clear(): JsonElement? {
        prefs.edit().clear().apply()
        return null // Success with no return value
    }
}
