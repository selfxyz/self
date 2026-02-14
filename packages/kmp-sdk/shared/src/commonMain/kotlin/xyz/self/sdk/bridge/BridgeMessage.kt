package xyz.self.sdk.bridge

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

const val BRIDGE_PROTOCOL_VERSION = 1
const val DEFAULT_TIMEOUT_MS = 30_000L

@Serializable
enum class BridgeDomain {
    @SerialName("nfc")
    NFC,

    @SerialName("biometrics")
    BIOMETRICS,

    @SerialName("secureStorage")
    SECURE_STORAGE,

    @SerialName("camera")
    CAMERA,

    @SerialName("crypto")
    CRYPTO,

    @SerialName("haptic")
    HAPTIC,

    @SerialName("analytics")
    ANALYTICS,

    @SerialName("lifecycle")
    LIFECYCLE,

    @SerialName("documents")
    DOCUMENTS,

    @SerialName("navigation")
    NAVIGATION,
}

@Serializable
data class BridgeError(
    val code: String,
    val message: String,
    val details: Map<String, JsonElement>? = null,
)

@Serializable
data class BridgeRequest(
    val type: String = "request",
    val version: Int,
    val id: String,
    val domain: BridgeDomain,
    val method: String,
    val params: Map<String, JsonElement>,
    val timestamp: Long,
)

@Serializable
data class BridgeResponse(
    val type: String = "response",
    val version: Int = BRIDGE_PROTOCOL_VERSION,
    val id: String,
    val domain: BridgeDomain,
    val requestId: String,
    val success: Boolean,
    val data: JsonElement? = null,
    val error: BridgeError? = null,
    val timestamp: Long = currentTimeMillis(),
)

@Serializable
data class BridgeEvent(
    val type: String = "event",
    val version: Int = BRIDGE_PROTOCOL_VERSION,
    val id: String,
    val domain: BridgeDomain,
    val event: String,
    val data: JsonElement,
    val timestamp: Long = currentTimeMillis(),
)

internal expect fun currentTimeMillis(): Long

internal expect fun generateUuid(): String
