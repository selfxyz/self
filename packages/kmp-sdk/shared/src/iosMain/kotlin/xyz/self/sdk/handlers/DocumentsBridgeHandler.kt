// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.providers.SdkProviderRegistry

class DocumentsBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.DOCUMENTS

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

    private fun loadCatalog(): JsonElement {
        val provider =
            SdkProviderRegistry.documents
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Documents provider not configured")

        val catalogJson =
            try {
                provider.loadCatalog()
            } catch (e: Exception) {
                throw BridgeHandlerException("PROVIDER_ERROR", "Failed to load catalog: ${e.message}")
            }
        return if (catalogJson != null) JsonPrimitive(catalogJson) else JsonNull
    }

    private fun saveCatalog(params: Map<String, JsonElement>): JsonElement? {
        val provider =
            SdkProviderRegistry.documents
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Documents provider not configured")

        val catalogData =
            params["data"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_DATA", "Catalog data parameter required")

        try {
            provider.saveCatalog(catalogData)
        } catch (e: Exception) {
            throw BridgeHandlerException("PROVIDER_ERROR", "Failed to save catalog: ${e.message}")
        }
        return null
    }

    private fun loadById(params: Map<String, JsonElement>): JsonElement {
        val provider =
            SdkProviderRegistry.documents
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Documents provider not configured")

        val id =
            params["id"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_ID", "Document ID parameter required")

        val documentJson =
            try {
                provider.loadById(id)
            } catch (e: Exception) {
                throw BridgeHandlerException("PROVIDER_ERROR", "Failed to load document: ${e.message}")
            }
        return if (documentJson != null) JsonPrimitive(documentJson) else JsonNull
    }

    private fun save(params: Map<String, JsonElement>): JsonElement? {
        val provider =
            SdkProviderRegistry.documents
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Documents provider not configured")

        val id =
            params["id"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_ID", "Document ID parameter required")
        val document =
            params["document"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_DOCUMENT", "Document parameter required")

        try {
            provider.save(id, document)
        } catch (e: Exception) {
            throw BridgeHandlerException("PROVIDER_ERROR", "Failed to save document: ${e.message}")
        }

        return buildJsonObject {
            put("id", id)
            put("success", true)
        }
    }

    private fun delete(params: Map<String, JsonElement>): JsonElement? {
        val provider =
            SdkProviderRegistry.documents
                ?: throw BridgeHandlerException("NOT_CONFIGURED", "Documents provider not configured")

        val id =
            params["id"]?.jsonPrimitive?.content
                ?: throw BridgeHandlerException("MISSING_ID", "Document ID parameter required")

        try {
            provider.delete(id)
        } catch (e: Exception) {
            throw BridgeHandlerException("PROVIDER_ERROR", "Failed to delete document: ${e.message}")
        }
        return null
    }
}
