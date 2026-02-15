package xyz.self.sdk.handlers

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException

/**
 * iOS stub for camera MRZ scanning bridge handler.
 * The test app uses MrzCameraHelper.swift directly instead of this handler.
 * TODO: Wire up to Swift MrzCameraHelper via cinterop for full SDK integration.
 */
@OptIn(ExperimentalForeignApi::class)
class CameraMrzBridgeHandler : BridgeHandler {
    override val domain = BridgeDomain.CAMERA

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "scanMRZ" -> scanMRZ()
            "isAvailable" -> isAvailable()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown camera method: $method",
            )
        }

    /** Stub — wire up to MrzCameraHelper.swift via cinterop. */
    private suspend fun scanMRZ(): JsonElement =
        throw BridgeHandlerException(
            "NOT_IMPLEMENTED",
            "MRZ scanning is handled by MrzCameraHelper.swift in the test app. " +
                "Wire up via cinterop for full SDK integration.",
        )

    private fun isAvailable(): JsonElement {
        // TODO: Check AVCaptureDevice availability via cinterop
        return JsonPrimitive(true)
    }
}
