// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import xyz.self.sdk.core.bridge.generated.BridgeCancel
import xyz.self.sdk.core.bridge.generated.BridgeCancelReason
import xyz.self.sdk.core.bridge.generated.BridgeError
import xyz.self.sdk.core.bridge.generated.BridgeErrorCode
import xyz.self.sdk.core.bridge.generated.BridgeErrorDetails
import xyz.self.sdk.core.bridge.generated.BridgeEvent
import xyz.self.sdk.core.bridge.generated.BridgeMessageType
import xyz.self.sdk.core.bridge.generated.BridgeRequest
import xyz.self.sdk.core.bridge.generated.BridgeResponse

/** What one message body from the web is (BC 4.6). */
internal sealed interface InboundMessage {
    data class Request(
        val request: BridgeRequest,
    ) : InboundMessage

    data class Cancel(
        val cancel: BridgeCancel,
    ) : InboundMessage

    /**
     * A request with a readable id and a required field that is missing, `null` or of the wrong
     * type. Native answers it with [toError]. [version], [domain] and [method] hold what could be
     * read, so the answer can copy the domain and the version rule of BC 5 can still apply.
     */
    data class InvalidRequest(
        val requestId: String,
        /** The first field at fault, in the order version, domain, method, params, timestamp. */
        val field: String,
        val version: Long?,
        val domain: String?,
        val method: String?,
    ) : InboundMessage {
        fun toError(): BridgeError =
            BridgeError(
                code = BridgeErrorCode.INVALID_PARAMS,
                message = "The request field \"$field\" is missing or has the wrong type",
                details = BridgeErrorDetails(field = field),
            )
    }

    /** Native sends no response. [reason] is for a debug log. */
    data class Dropped(
        val reason: DropReason,
    ) : InboundMessage
}

internal enum class DropReason {
    NOT_JSON,
    NOT_AN_OBJECT,

    /** No `id`, or an `id` that is not a non-empty string. */
    NO_READABLE_ID,

    /** `type` is not `request` or `cancel`. */
    NOT_A_REQUEST_OR_CANCEL,

    /** A cancel with a required field that is missing or of the wrong type. A cancel has no response. */
    INVALID_CANCEL,
}

/**
 * Reads a message body from the web and writes the messages native sends (BC 4). It applies the
 * rules of BC 4.1 and 4.6 that need no state: an unknown field is ignored, and `null` is the same
 * as absent. It does not check that native serves the version, the domain or the method.
 */
internal object EnvelopeCodec {
    fun decode(body: String): InboundMessage {
        val parsed =
            try {
                JsonText.parse(body)
            } catch (_: JsonParseException) {
                return InboundMessage.Dropped(DropReason.NOT_JSON)
            }
        val fields = (parsed as? JsonObject)?.members ?: return InboundMessage.Dropped(DropReason.NOT_AN_OBJECT)
        val id = fields.text("id") ?: return InboundMessage.Dropped(DropReason.NO_READABLE_ID)
        return when (fields.text("type")) {
            BridgeMessageType.REQUEST.wire -> decodeRequest(id, fields)
            BridgeMessageType.CANCEL.wire -> decodeCancel(id, fields)
            else -> InboundMessage.Dropped(DropReason.NOT_A_REQUEST_OR_CANCEL)
        }
    }

    /** Throws [IllegalArgumentException] for a response that the contract does not allow. */
    fun encode(response: BridgeResponse): String {
        require(response.success == (response.error == null)) {
            "A response has an error when success is false, and only then"
        }
        val fields = envelope(BridgeMessageType.RESPONSE, response.version, response.id, response.domain, response.timestamp)
        fields["requestId"] = JsonString(response.requestId)
        fields["success"] = JsonBool(response.success)
        response.data?.takeIf { it != JsonNull }?.let { fields["data"] = it }
        response.error?.let { fields["error"] = errorValue(it) }
        return JsonText.write(JsonObject(fields))
    }

    fun encode(event: BridgeEvent): String {
        val fields = envelope(BridgeMessageType.EVENT, event.version, event.id, event.domain, event.timestamp)
        fields["event"] = JsonString(event.event)
        event.requestId?.let { fields["requestId"] = JsonString(it) }
        fields["data"] = JsonObject(event.data)
        return JsonText.write(JsonObject(fields))
    }

    private fun decodeRequest(
        id: String,
        fields: Map<String, JsonValue>,
    ): InboundMessage {
        val version = fields.wholeNumber("version")
        val domain = fields.text("domain")
        val method = fields.text("method")
        val params = (fields["params"] as? JsonObject)?.members
        val timestamp = (fields["timestamp"] as? JsonNumber)?.value

        fun invalid(field: String) = InboundMessage.InvalidRequest(id, field, version, domain, method)
        return InboundMessage.Request(
            BridgeRequest(
                version = version ?: return invalid("version"),
                id = id,
                domain = domain ?: return invalid("domain"),
                method = method ?: return invalid("method"),
                params = params ?: return invalid("params"),
                timestamp = timestamp ?: return invalid("timestamp"),
            ),
        )
    }

    private fun decodeCancel(
        id: String,
        fields: Map<String, JsonValue>,
    ): InboundMessage {
        val dropped = InboundMessage.Dropped(DropReason.INVALID_CANCEL)
        return InboundMessage.Cancel(
            BridgeCancel(
                version = fields.wholeNumber("version") ?: return dropped,
                id = id,
                domain = fields.text("domain") ?: return dropped,
                requestId = fields.text("requestId") ?: return dropped,
                // For logs only, so a value outside the list reads as absent.
                reason = fields.text("reason")?.let(BridgeCancelReason::fromWire),
                timestamp = (fields["timestamp"] as? JsonNumber)?.value ?: return dropped,
            ),
        )
    }

    private fun envelope(
        type: BridgeMessageType,
        version: Long,
        id: String,
        domain: String,
        timestamp: Double,
    ): MutableMap<String, JsonValue> =
        mutableMapOf(
            "type" to JsonString(type.wire),
            "version" to JsonNumber(version.toDouble()),
            "id" to JsonString(id),
            "domain" to JsonString(domain),
            "timestamp" to JsonNumber(timestamp),
        )

    private fun errorValue(error: BridgeError): JsonValue {
        val fields = mutableMapOf<String, JsonValue>("code" to JsonString(error.code.wire), "message" to JsonString(error.message))
        error.details
            ?.let(::detailsFields)
            ?.takeIf { it.isNotEmpty() }
            ?.let { fields["details"] = JsonObject(it) }
        return JsonObject(fields)
    }

    private fun detailsFields(details: BridgeErrorDetails): Map<String, JsonValue> =
        buildMap {
            details.reason?.let { put("reason", JsonString(it)) }
            details.field?.let { put("field", JsonString(it)) }
            details.supported?.let { majors -> put("supported", JsonArray(majors.map { JsonNumber(it.toDouble()) })) }
            details.origin?.let { put("origin", JsonString(it.wire)) }
            details.permission?.let { put("permission", JsonString(it)) }
            details.canAskAgain?.let { put("canAskAgain", JsonBool(it)) }
        }

    /** A non-empty string. Absent, `null`, another type and the empty string all read as null. */
    private fun Map<String, JsonValue>.text(key: String): String? = (this[key] as? JsonString)?.value?.takeIf { it.isNotEmpty() }

    private fun Map<String, JsonValue>.wholeNumber(key: String): Long? = (this[key] as? JsonNumber)?.let { JsonText.wholeNumber(it.value) }
}
