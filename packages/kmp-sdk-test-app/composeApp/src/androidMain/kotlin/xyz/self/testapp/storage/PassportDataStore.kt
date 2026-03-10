// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import xyz.self.testapp.models.PassportData

/**
 * Secure storage for passport data using EncryptedSharedPreferences.
 * Based on the pattern from SecureStorageBridgeHandler in the SDK.
 */
class PassportDataStore(
    context: Context,
) {
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
                "passport_data_prefs",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
    }

    /**
     * Saves passport data to encrypted storage
     */
    fun savePassportData(passportData: PassportData) {
        val jsonString = Json.encodeToString(passportData)
        prefs.edit().putString(KEY_PASSPORT_DATA, jsonString).apply()
    }

    /**
     * Retrieves passport data from encrypted storage
     * Returns null if no data is saved
     */
    fun getPassportData(): PassportData? {
        val jsonString = prefs.getString(KEY_PASSPORT_DATA, null) ?: return null
        return try {
            Json.decodeFromString<PassportData>(jsonString)
        } catch (e: Exception) {
            // If deserialization fails, return null
            null
        }
    }

    /**
     * Clears all saved passport data
     */
    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_PASSPORT_DATA = "passport_data"
    }
}
