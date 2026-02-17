// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler

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

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? = null
}
