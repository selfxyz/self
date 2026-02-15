package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * iOS implementation of documents storage bridge handler.
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - cinterop with Foundation framework (NSUserDefaults or FileManager)
 * - Encrypted file storage using Data Protection
 *
 * Enable cinterop in build.gradle.kts and implement using platform.Foundation APIs.
 */
class DocumentsBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.DOCUMENTS

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        throw BridgeHandlerException(
            "NOT_IMPLEMENTED",
            "iOS document storage not yet implemented. " +
                "Requires Foundation framework cinterop.",
        )
}
