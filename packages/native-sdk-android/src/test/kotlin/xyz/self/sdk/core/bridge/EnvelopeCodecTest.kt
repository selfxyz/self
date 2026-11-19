// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import xyz.self.sdk.core.bridge.generated.BridgeCancel
import xyz.self.sdk.core.bridge.generated.BridgeCancelReason
import xyz.self.sdk.core.bridge.generated.BridgeError
import xyz.self.sdk.core.bridge.generated.BridgeErrorCode
import xyz.self.sdk.core.bridge.generated.BridgeErrorDetails
import xyz.self.sdk.core.bridge.generated.BridgeErrorOrigin
import xyz.self.sdk.core.bridge.generated.BridgeEvent
import xyz.self.sdk.core.bridge.generated.BridgeRequest
import xyz.self.sdk.core.bridge.generated.BridgeResponse

/** The Swift library has the same cases in `EnvelopeCodecTests`. Change both together. */
class EnvelopeCodecTest {
    private val id = "0b6c1d0e-7f1a-4c53-9a55-2f1f2a9f6f01"
    private val otherId = "5a0c8f0d-33a1-4a7e-8f55-0c1d2e3f4a5b"

    private fun request(vararg changes: Pair<String, String?>): String =
        body("request", "\"method\":\"has\",\"params\":{\"key\":\"k\"}", changes)

    private fun cancel(vararg changes: Pair<String, String?>): String =
        body("cancel", "\"requestId\":\"$otherId\",\"reason\":\"user\"", changes)

    /** A valid body, with each named field replaced by the given JSON text, or removed for null. */
    private fun body(
        type: String,
        rest: String,
        changes: Array<out Pair<String, String?>>,
    ): String {
        val base = "{\"type\":\"$type\",\"version\":2,\"id\":\"$id\",\"domain\":\"secureStorage\",$rest,\"timestamp\":1794650000000}"
        val fields = (JsonText.parse(base) as JsonObject).members.toMutableMap()
        for ((field, json) in changes) {
            if (json == null) fields.remove(field) else fields[field] = JsonText.parse(json)
        }
        return JsonText.write(JsonObject(fields))
    }

    private fun invalid(
        field: String,
        version: Long? = 2,
        domain: String? = "secureStorage",
        method: String? = "has",
    ) = InboundMessage.InvalidRequest(id, field, version, domain, method)

    private val dropped = { reason: DropReason -> InboundMessage.Dropped(reason) }

    @Test
    fun readsARequest() {
        assertEquals(
            InboundMessage.Request(
                BridgeRequest(2, id, "secureStorage", "has", mapOf("key" to JsonString("k")), 1_794_650_000_000.0),
            ),
            EnvelopeCodec.decode(request()),
        )
    }

    @Test
    fun ignoresFieldsItDoesNotKnow() {
        assertEquals(EnvelopeCodec.decode(request()), EnvelopeCodec.decode(request("trace" to "\"a1\"", "requestId" to "7")))
        assertEquals(EnvelopeCodec.decode(cancel()), EnvelopeCodec.decode(cancel("trace" to "{}", "method" to "null")))
    }

    @Test
    fun doesNotJudgeTheVersionTheDomainOrTheMethod() {
        val message = EnvelopeCodec.decode(request("version" to "3", "domain" to "\"crypto\"", "method" to "\"sign\""))

        assertEquals(
            InboundMessage.Request(BridgeRequest(3, id, "crypto", "sign", mapOf("key" to JsonString("k")), 1_794_650_000_000.0)),
            message,
        )
        assertEquals(0L, (EnvelopeCodec.decode(request("version" to "0")) as InboundMessage.Request).request.version)
    }

    @Test
    fun dropsABodyThatIsNotJsonOrNotAnObject() {
        assertEquals(dropped(DropReason.NOT_JSON), EnvelopeCodec.decode("{\"type\":\"request\",\"version\":2,"))
        assertEquals(dropped(DropReason.NOT_JSON), EnvelopeCodec.decode(""))
        assertEquals(dropped(DropReason.NOT_AN_OBJECT), EnvelopeCodec.decode("[\"request\"]"))
        assertEquals(dropped(DropReason.NOT_AN_OBJECT), EnvelopeCodec.decode("\"request\""))
        assertEquals(dropped(DropReason.NOT_AN_OBJECT), EnvelopeCodec.decode("null"))
    }

    @Test
    fun dropsAMessageWithNoReadableId() {
        for (idText in listOf(null, "null", "7", "\"\"", "[\"$id\"]", "true")) {
            assertEquals(idText, dropped(DropReason.NO_READABLE_ID), EnvelopeCodec.decode(request("id" to idText)))
            assertEquals(idText, dropped(DropReason.NO_READABLE_ID), EnvelopeCodec.decode(cancel("id" to idText)))
        }
        assertEquals(dropped(DropReason.NO_READABLE_ID), EnvelopeCodec.decode("{}"))
    }

    @Test
    fun dropsAMessageThatIsNotARequestOrACancel() {
        for (type in listOf(null, "null", "\"response\"", "\"event\"", "\"Request\"", "7")) {
            assertEquals(type, dropped(DropReason.NOT_A_REQUEST_OR_CANCEL), EnvelopeCodec.decode(request("type" to type)))
        }
    }

    @Test
    fun aRequestFieldThatIsMissingNullOrOfTheWrongTypeIsInvalid() {
        val wrong =
            mapOf(
                "version" to listOf(null, "null", "\"2\"", "2.5", "true", "9007199254740994"),
                "domain" to listOf(null, "null", "7", "\"\"", "[]"),
                "method" to listOf(null, "null", "7", "\"\"", "{}"),
                "params" to listOf(null, "null", "[]", "\"{}\"", "0"),
                "timestamp" to listOf(null, "null", "\"now\"", "true", "{}"),
            )
        for ((field, values) in wrong) {
            for (value in values) {
                val expected =
                    invalid(
                        field,
                        version = if (field == "version") null else 2,
                        domain = if (field == "domain") null else "secureStorage",
                        method = if (field == "method") null else "has",
                    )
                assertEquals("$field = $value", expected, EnvelopeCodec.decode(request(field to value)))
            }
        }
    }

    @Test
    fun namesTheFirstFieldAtFaultInEnvelopeOrder() {
        assertEquals(
            invalid("version", version = null, method = null),
            EnvelopeCodec.decode(request("timestamp" to null, "method" to "7", "version" to null)),
        )
        assertEquals(invalid("domain", domain = null), EnvelopeCodec.decode(request("params" to "[]", "domain" to null)))
        assertEquals(invalid("method", method = null), EnvelopeCodec.decode(request("params" to "[]", "method" to null)))
        assertEquals(invalid("params"), EnvelopeCodec.decode(request("params" to "[]", "timestamp" to "\"now\"")))
    }

    @Test
    fun anInvalidRequestGivesTheInvalidParamsErrorWithTheField() {
        val error = invalid("params").toError()

        assertEquals(BridgeErrorCode.INVALID_PARAMS, error.code)
        assertEquals(BridgeErrorDetails(field = "params"), error.details)
    }

    @Test
    fun readsACancelAndItsReason() {
        fun reasonOf(json: String?) = (EnvelopeCodec.decode(cancel("reason" to json)) as InboundMessage.Cancel).cancel.reason

        assertEquals(
            InboundMessage.Cancel(BridgeCancel(2, id, "secureStorage", otherId, BridgeCancelReason.USER, 1_794_650_000_000.0)),
            EnvelopeCodec.decode(cancel()),
        )
        assertEquals(BridgeCancelReason.NAVIGATION, reasonOf("\"navigation\""))
        assertEquals(BridgeCancelReason.TIMEOUT, reasonOf("\"timeout\""))
        for (json in listOf(null, "null", "\"other\"", "7")) {
            assertEquals(json, null, reasonOf(json))
        }
    }

    @Test
    fun dropsACancelWithARequiredFieldAtFault() {
        val wrong = listOf("version" to "\"2\"", "domain" to null, "requestId" to null, "requestId" to "7", "timestamp" to "null")
        for (change in wrong) {
            assertEquals(change.toString(), dropped(DropReason.INVALID_CANCEL), EnvelopeCodec.decode(cancel(change)))
        }
    }

    @Test
    fun writesAResponseWithData() {
        val response =
            BridgeResponse(
                version = 2,
                id = otherId,
                domain = "secureStorage",
                requestId = id,
                success = true,
                data = JsonObject(mapOf("exists" to JsonBool(true), "protection" to JsonString("userPresence"))),
                timestamp = 1_794_650_000_012.0,
            )

        assertEquals(
            "{\"data\":{\"exists\":true,\"protection\":\"userPresence\"},\"domain\":\"secureStorage\",\"id\":\"$otherId\"," +
                "\"requestId\":\"$id\",\"success\":true,\"timestamp\":1794650000012,\"type\":\"response\",\"version\":2}",
            EnvelopeCodec.encode(response),
        )
    }

    @Test
    fun leavesOutAnOptionalFieldThatHasNoValue() {
        val base = BridgeResponse(2, otherId, "lifecycle", id, success = true, timestamp = 5.0)
        val bare =
            "{\"domain\":\"lifecycle\",\"id\":\"$otherId\",\"requestId\":\"$id\",\"success\":true,\"timestamp\":5,\"type\":\"response\",\"version\":2}"

        assertEquals(bare, EnvelopeCodec.encode(base))
        assertEquals(bare, EnvelopeCodec.encode(base.copy(data = JsonNull)))
        assertEquals(
            "{\"code\":\"CANCELLED\",\"message\":\"m\"}",
            errorText(BridgeError(BridgeErrorCode.CANCELLED, "m")),
        )
        assertEquals(
            "{\"code\":\"CANCELLED\",\"message\":\"m\"}",
            errorText(BridgeError(BridgeErrorCode.CANCELLED, "m", BridgeErrorDetails())),
        )
    }

    @Test
    fun writesAnErrorWithItsDetails() {
        val details =
            BridgeErrorDetails(
                reason = "nfc_disabled",
                field = "params",
                supported = listOf(2L),
                origin = BridgeErrorOrigin.NATIVE,
                permission = "camera",
                canAskAgain = false,
            )

        assertEquals(
            "{\"code\":\"UNAVAILABLE\",\"details\":{\"canAskAgain\":false,\"field\":\"params\",\"origin\":\"native\"," +
                "\"permission\":\"camera\",\"reason\":\"nfc_disabled\",\"supported\":[2]},\"message\":\"it's off\"}",
            errorText(BridgeError(BridgeErrorCode.UNAVAILABLE, "it's off", details)),
        )
    }

    @Test
    fun refusesAResponseWhoseSuccessAndErrorDisagree() {
        val base = BridgeResponse(2, otherId, "lifecycle", id, success = true, timestamp = 5.0)

        assertThrows(IllegalArgumentException::class.java) {
            EnvelopeCodec.encode(base.copy(error = BridgeError(BridgeErrorCode.FAILED, "m")))
        }
        assertThrows(IllegalArgumentException::class.java) { EnvelopeCodec.encode(base.copy(success = false)) }
        assertThrows(IllegalArgumentException::class.java) { EnvelopeCodec.encode(base.copy(data = JsonNumber(Double.NaN))) }
    }

    @Test
    fun writesAnEventWithAndWithoutARequestId() {
        val event = BridgeEvent(2, otherId, "nfc", "scanProgress", id, mapOf("percent" to JsonNumber(40.0)), 1_794_650_003_500.0)

        assertEquals(
            "{\"data\":{\"percent\":40},\"domain\":\"nfc\",\"event\":\"scanProgress\",\"id\":\"$otherId\"," +
                "\"requestId\":\"$id\",\"timestamp\":1794650003500,\"type\":\"event\",\"version\":2}",
            EnvelopeCodec.encode(event),
        )
        assertEquals(
            "{\"data\":{},\"domain\":\"navigation\",\"event\":\"back\",\"id\":\"$otherId\",\"timestamp\":0.5,\"type\":\"event\",\"version\":2}",
            EnvelopeCodec.encode(BridgeEvent(2, otherId, "navigation", "back", data = emptyMap(), timestamp = 0.5)),
        )
    }

    private fun errorText(error: BridgeError): String {
        val response = BridgeResponse(2, otherId, "nfc", id, success = false, error = error, timestamp = 5.0)
        val fields = (JsonText.parse(EnvelopeCodec.encode(response)) as JsonObject).members
        return JsonText.write(fields.getValue("error"))
    }
}
