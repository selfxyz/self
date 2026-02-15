package xyz.self.sdk.handlers

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * iOS implementation of lifecycle bridge handler.
 * Manages WebView lifecycle and communication with the host ViewController.
 *
 * Note: This is a stub implementation. Full implementation requires:
 * - Reference to the presenting UIViewController
 * - Callback mechanism to communicate results to host app
 * - Modal dismissal logic
 */
@OptIn(ExperimentalForeignApi::class)
class LifecycleBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.LIFECYCLE

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "ready" -> ready()
            "dismiss" -> dismiss()
            "setResult" -> setResult(params)
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown lifecycle method: $method",
            )
        }

    /**
     * Called when the WebView has finished loading and is ready.
     */
    private fun ready(): JsonElement? {
        // No-op for now. Host app can listen for this via events if needed.
        return null
    }

    /**
     * Dismisses the verification ViewController without setting a result.
     * Equivalent to the user cancelling the flow.
     */
    private fun dismiss(): JsonElement? {
        // TODO: Implement ViewController dismissal
        // This requires a reference to the presenting UIViewController
        // viewController.dismissViewControllerAnimated(true, completion = null)

        throw BridgeHandlerException(
            "NOT_IMPLEMENTED",
            "iOS lifecycle dismiss not yet fully implemented. " +
                "Requires UIViewController reference.",
        )
    }

    /**
     * Sets a result and dismisses the ViewController.
     * Used to communicate verification results back to the host app.
     */
    private fun setResult(params: Map<String, JsonElement>): JsonElement? {
        val success = params["success"]?.jsonPrimitive?.content?.toBoolean() ?: false
        val data = params["data"]?.toString()
        val errorCode = params["errorCode"]?.jsonPrimitive?.content
        val errorMessage = params["errorMessage"]?.jsonPrimitive?.content

        // TODO: Implement result callback and dismissal
        // 1. Store result data
        // 2. Invoke callback to host app
        // 3. Dismiss ViewController

        throw BridgeHandlerException(
            "NOT_IMPLEMENTED",
            "iOS lifecycle setResult not yet fully implemented. " +
                "Requires callback mechanism to host app.",
        )
    }
}
