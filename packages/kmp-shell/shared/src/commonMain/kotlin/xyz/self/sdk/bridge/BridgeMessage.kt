// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Bridge protocol version. Must match the TypeScript BRIDGE_PROTOCOL_VERSION constant.
 */
const val BRIDGE_PROTOCOL_VERSION = 1

/**
 * Bridge domain identifiers matching the TypeScript BridgeDomain type.
 */
@Serializable
enum class BridgeDomain {
    @SerialName("nfc") NFC,
    @SerialName("biometrics") BIOMETRICS,
    @SerialName("secureStorage") SECURE_STORAGE,
    @SerialName("camera") CAMERA,
    @SerialName("crypto") CRYPTO,
    @SerialName("haptic") HAPTIC,
    @SerialName("analytics") ANALYTICS,
    @SerialName("lifecycle") LIFECYCLE,
    @SerialName("documents") DOCUMENTS,
    @SerialName("navigation") NAVIGATION,
}

/**
 * Structured error matching the TypeScript BridgeError interface.
 */
@Serializable
data class BridgeError(
    val code: String,
    val message: String,
    val details: Map<String, JsonElement>? = null,
)

/**
 * Incoming request from WebView (JS → Native).
 */
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

/**
 * Outgoing response from Native to WebView (Native → JS).
 */
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

/**
 * Outgoing event from Native to WebView (Native → JS, unsolicited).
 */
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

/**
 * Platform-independent time function. Implemented via expect/actual.
 */
internal expect fun currentTimeMillis(): Long

/**
 * Platform-independent UUID generator. Implemented via expect/actual.
 */
internal expect fun generateUuid(): String
