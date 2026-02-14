package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * iOS implementation of haptic feedback bridge handler.
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - cinterop with UIKit framework (UIImpactFeedbackGenerator)
 *
 * Enable cinterop in build.gradle.kts and implement using platform.UIKit APIs.
 */
class HapticBridgeHandler : BridgeHandler {

    override val domain = BridgeDomain.HAPTIC

    override suspend fun handle(method: String, params: Map<String, JsonElement>): JsonElement? {
        throw BridgeHandlerException(
            "NOT_IMPLEMENTED",
            "iOS haptic feedback not yet implemented. " +
            "Requires UIKit framework cinterop."
        )
    }
}
