package xyz.self.sdk.bridge

import kotlinx.serialization.json.JsonElement

interface BridgeHandler {
    val domain: BridgeDomain

    suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement?
}

class BridgeHandlerException(
    val code: String,
    override val message: String,
    val details: Map<String, JsonElement>? = null,
) : Exception(message)
