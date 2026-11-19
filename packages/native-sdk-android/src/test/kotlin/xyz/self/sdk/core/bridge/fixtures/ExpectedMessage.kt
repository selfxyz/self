// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge.fixtures

import xyz.self.sdk.core.bridge.EnvelopeCodec
import xyz.self.sdk.core.bridge.JsonArray
import xyz.self.sdk.core.bridge.JsonBool
import xyz.self.sdk.core.bridge.JsonNumber
import xyz.self.sdk.core.bridge.JsonObject
import xyz.self.sdk.core.bridge.JsonString
import xyz.self.sdk.core.bridge.generated.BridgeError
import xyz.self.sdk.core.bridge.generated.BridgeErrorCode
import xyz.self.sdk.core.bridge.generated.BridgeErrorDetails
import xyz.self.sdk.core.bridge.generated.BridgeErrorOrigin
import xyz.self.sdk.core.bridge.generated.BridgeEvent
import xyz.self.sdk.core.bridge.generated.BridgeResponse
import java.util.UUID

/**
 * The text a correct native emits for an `expect`: the typed message with the fields of the
 * `expect`, written by the codec. It lets the codec's writer be checked against a fixture before a
 * router exists to emit the message.
 */
internal object ExpectedMessage {
    fun encode(expect: JsonFields): String {
        val version = (expect.getValue("version") as JsonNumber).value.toLong()
        val domain = expect.text("domain")!!
        val id = UUID.randomUUID().toString()
        return when (val type = expect.text("type")) {
            "response" ->
                EnvelopeCodec.encode(
                    BridgeResponse(
                        version = version,
                        id = id,
                        domain = domain,
                        requestId = expect.text("requestId")!!,
                        success = (expect.getValue("success") as JsonBool).value,
                        data = expect["data"],
                        error = (expect["error"] as? JsonObject)?.members?.let(::error),
                        timestamp = FixturePlaceholders.TIMESTAMP,
                    ),
                )
            "event" ->
                EnvelopeCodec.encode(
                    BridgeEvent(
                        version = version,
                        id = id,
                        domain = domain,
                        event = expect.text("event")!!,
                        requestId = expect.text("requestId"),
                        data = (expect.getValue("data") as JsonObject).members,
                        timestamp = FixturePlaceholders.TIMESTAMP,
                    ),
                )
            else -> error("An expect must be a response or an event, not $type")
        }
    }

    private fun error(fields: JsonFields): BridgeError {
        val details = (fields["details"] as? JsonObject)?.members
        return BridgeError(
            code = BridgeErrorCode.fromWire(fields.text("code")!!)!!,
            message = "for logs",
            details =
                details?.let {
                    BridgeErrorDetails(
                        reason = it.text("reason"),
                        field = it.text("field"),
                        supported = (it["supported"] as? JsonArray)?.items?.map { major -> (major as JsonNumber).value.toLong() },
                        origin = it.text("origin")?.let(BridgeErrorOrigin::fromWire),
                        permission = it.text("permission"),
                        canAskAgain = (it["canAskAgain"] as? JsonBool)?.value,
                    )
                },
        )
    }

    private fun JsonFields.text(key: String): String? = (this[key] as? JsonString)?.value
}
