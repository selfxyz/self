package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler

/**
 * iOS implementation of analytics bridge handler.
 *
 * NOTE: Simple stub that allows fire-and-forget analytics.
 * Full implementation would use NSLog or os_log via cinterop.
 */
class AnalyticsBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.ANALYTICS

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? {
        // Fire-and-forget - silently accept analytics events
        return null
    }
}
