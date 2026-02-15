package xyz.self.sdk.handlers

import android.content.Context
import android.content.SharedPreferences
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
 * Android implementation of documents storage bridge handler.
 * Uses EncryptedSharedPreferences to securely store passport and verification documents.
 */
class DocumentsBridgeHandler(
    context: Context,
) : BridgeHandler {
    override val domain = BridgeDomain.DOCUMENTS

    private val prefs: SharedPreferences

    init {
        // Create master key for encryption
        val masterKey =
            MasterKey
                .Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

        // Create encrypted shared preferences for documents
        prefs =
            EncryptedSharedPreferences.create(
                context,
                "self_sdk_documents",
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
            "loadCatalog" -> loadCatalog()
            "saveCatalog" -> saveCatalog(params)
            "loadById" -> loadById(params)
            "save" -> save(params)
            "delete" -> delete(params)
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown documents method: $method",
            )
        }

    /**
     * Loads the document catalog (list of document IDs and metadata).
     * Returns null if no catalog exists.
     */
    private fun loadCatalog(): JsonElement {
        val catalogJson = prefs.getString("__catalog__", null)

        return if (catalogJson != null) {
            JsonPrimitive(catalogJson)
        } else {
            JsonNull
        }
    }

    /**
     * Saves the document catalog.
     * The catalog contains metadata about stored documents.
     */
    private fun saveCatalog(params: Map<String, JsonElement>): JsonElement? {
        val catalogData =
            params["data"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_DATA", "Catalog data parameter required")

        prefs.edit().putString("__catalog__", catalogData).apply()

        return null // Success with no return value
    }

    /**
     * Loads a specific document by ID.
     * Returns null if the document doesn't exist.
     */
    private fun loadById(params: Map<String, JsonElement>): JsonElement {
        val id =
            params["id"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_ID", "Document ID parameter required")

        val documentJson = prefs.getString("doc_$id", null)

        return if (documentJson != null) {
            JsonPrimitive(documentJson)
        } else {
            JsonNull
        }
    }

    /**
     * Saves a document with the specified ID.
     * The document data should be a JSON-serializable object.
     */
    private fun save(params: Map<String, JsonElement>): JsonElement? {
        val id =
            params["id"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_ID", "Document ID parameter required")

        val document =
            params["document"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_DOCUMENT", "Document parameter required")

        prefs.edit().putString("doc_$id", document).apply()

        return buildJsonObject {
            put("id", id)
            put("success", true)
        }
    }

    /**
     * Deletes a document by ID.
     */
    private fun delete(params: Map<String, JsonElement>): JsonElement? {
        val id =
            params["id"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_ID", "Document ID parameter required")

        prefs.edit().remove("doc_$id").apply()

        return null // Success with no return value
    }
}
