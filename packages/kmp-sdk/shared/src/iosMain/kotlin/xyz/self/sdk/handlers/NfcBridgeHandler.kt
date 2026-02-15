package xyz.self.sdk.handlers

import kotlinx.cinterop.ExperimentalForeignApi
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import xyz.self.sdk.bridge.BridgeDomain
import xyz.self.sdk.bridge.BridgeHandler
import xyz.self.sdk.bridge.BridgeHandlerException
import xyz.self.sdk.bridge.MessageRouter

/**
 * iOS stub for NFC passport scanning bridge handler.
 * The test app uses NfcPassportHelper.swift directly instead of this handler.
 * TODO: Wire up to Swift NfcPassportHelper via cinterop for full SDK integration.
 */
@OptIn(ExperimentalForeignApi::class)
class NfcBridgeHandler(
    private val router: MessageRouter,
) : BridgeHandler {
    override val domain = BridgeDomain.NFC

    override suspend fun handle(
        method: String,
        params: Map<String, JsonElement>,
    ): JsonElement? =
        when (method) {
            "scan" -> scan(params)
            "cancelScan" -> cancelScan()
            "isSupported" -> isSupported()
            else -> throw BridgeHandlerException(
                "METHOD_NOT_FOUND",
                "Unknown NFC method: $method",
            )
        }

    /** Stub — wire up to NfcPassportHelper.swift via cinterop. */
    private suspend fun scan(params: Map<String, JsonElement>): JsonElement {
        params["passportNumber"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_PASSPORT_NUMBER", "Passport number required")
        params["dateOfBirth"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_DOB", "Date of birth required")
        params["dateOfExpiry"]?.jsonPrimitive?.content
            ?: throw BridgeHandlerException("MISSING_EXPIRY", "Date of expiry required")

        throw BridgeHandlerException(
            "NOT_IMPLEMENTED",
            "NFC scanning is handled by NfcPassportHelper.swift in the test app. " +
                "Wire up via cinterop for full SDK integration.",
        )
    }

    private fun cancelScan(): JsonElement? = null

    private fun isSupported(): JsonElement {
        // TODO: Use NFCReaderSession.readingAvailable via cinterop
        return JsonPrimitive(false)
    }
}
