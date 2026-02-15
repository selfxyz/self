package xyz.self.sdk.testutil

import kotlinx.coroutines.delay
import kotlinx.serialization.json.JsonElement
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler

class FakeBridgeHandler(
    override val domain: BridgeDomain,
    private val response: JsonElement? = null,
    private val delayMs: Long = 0,
    private val error: Exception? = null,
) : BridgeHandler {
    data class Invocation(
        val method: String,
        val params: Map<String, JsonElement>,
    )

    val invocations = mutableListOf<Invocation>()

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? {
        invocations.add(Invocation(method, params))
        if (delayMs > 0) delay(delayMs)
        if (error != null) throw error
        return response
    }
}
