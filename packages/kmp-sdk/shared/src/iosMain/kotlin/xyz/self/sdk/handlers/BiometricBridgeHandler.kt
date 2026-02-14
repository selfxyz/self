package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * iOS implementation of biometric authentication bridge handler.
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - cinterop with LocalAuthentication framework (LAContext, LAPolicy, etc.)
 * - Touch ID / Face ID authentication flows
 *
 * Enable cinterop in build.gradle.kts and implement using platform.LocalAuthentication APIs.
 */
class BiometricBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.BIOMETRICS

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        throw BridgeHandlerException(
            "NOT_IMPLEMENTED",
            "iOS biometric authentication not yet implemented. " +
                "Requires LocalAuthentication framework cinterop.",
        )
}
