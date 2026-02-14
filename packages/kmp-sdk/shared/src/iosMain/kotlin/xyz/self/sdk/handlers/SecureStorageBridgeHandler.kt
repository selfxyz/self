package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * iOS implementation of secure storage bridge handler.
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - cinterop with Security framework (Keychain Services API)
 * - SecItemAdd, SecItemCopyMatching, SecItemUpdate, SecItemDelete functions
 *
 * Enable cinterop in build.gradle.kts and implement using platform.Security APIs.
 */
class SecureStorageBridgeHandler : BridgeHandler {

    override val domain = BridgeDomain.SECURE_STORAGE

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        throw BridgeHandlerException(
            "NOT_IMPLEMENTED",
            "iOS secure storage not yet implemented. " +
            "Requires Security framework cinterop for Keychain access."
        )
    }
}
