// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

/// The Kotlin library has the same cases in `EnvelopeCodecTest`. Change both together.
final class EnvelopeCodecTests: XCTestCase {
    private let id = "0b6c1d0e-7f1a-4c53-9a55-2f1f2a9f6f01"
    private let otherId = "5a0c8f0d-33a1-4a7e-8f55-0c1d2e3f4a5b"

    private func request(_ changes: [(String, String?)] = []) throws -> String {
        try body("request", #""method":"has","params":{"key":"k"}"#, changes)
    }

    private func cancel(_ changes: [(String, String?)] = []) throws -> String {
        try body("cancel", "\"requestId\":\"\(otherId)\",\"reason\":\"user\"", changes)
    }

    /// A valid body, with each named field replaced by the given JSON text, or removed for nil.
    private func body(_ type: String, _ rest: String, _ changes: [(String, String?)]) throws -> String {
        let base =
            "{\"type\":\"\(type)\",\"version\":2,\"id\":\"\(id)\",\"domain\":\"secureStorage\",\(rest),"
            + "\"timestamp\":1794650000000}"
        var fields = try XCTUnwrap(JSONText.parse(base).fields)
        for (field, json) in changes {
            fields[field] = try json.map(JSONText.parse)
        }
        return try JSONText.write(.object(fields))
    }

    private func invalid(
        _ field: String, version: Int? = 2, domain: String? = "secureStorage", method: String? = "has"
    ) -> InboundMessage {
        .invalidRequest(InvalidRequest(requestId: id, field: field, version: version, domain: domain, method: method))
    }

    private func validRequest(
        version: Int = 2, domain: String = "secureStorage", method: String = "has"
    ) -> InboundMessage {
        .request(
            BridgeRequest(
                version: version, id: id, domain: domain, method: method, params: ["key": .string("k")],
                timestamp: 1_794_650_000_000
            )
        )
    }

    func testReadsARequest() throws {
        XCTAssertEqual(EnvelopeCodec.decode(try request()), validRequest())
    }

    func testIgnoresFieldsItDoesNotKnow() throws {
        XCTAssertEqual(EnvelopeCodec.decode(try request([("trace", "\"a1\""), ("requestId", "7")])), validRequest())
        XCTAssertEqual(
            EnvelopeCodec.decode(try cancel([("trace", "{}"), ("method", "null")])),
            EnvelopeCodec.decode(try cancel())
        )
    }

    func testDoesNotJudgeTheVersionTheDomainOrTheMethod() throws {
        let changed = try request([("version", "3"), ("domain", "\"crypto\""), ("method", "\"sign\"")])

        XCTAssertEqual(EnvelopeCodec.decode(changed), validRequest(version: 3, domain: "crypto", method: "sign"))
        XCTAssertEqual(EnvelopeCodec.decode(try request([("version", "0")])), validRequest(version: 0))
    }

    func testDropsABodyThatIsNotJSONOrNotAnObject() {
        XCTAssertEqual(EnvelopeCodec.decode(#"{"type":"request","version":2,"#), .dropped(.notJSON))
        XCTAssertEqual(EnvelopeCodec.decode(""), .dropped(.notJSON))
        XCTAssertEqual(EnvelopeCodec.decode(#"["request"]"#), .dropped(.notAnObject))
        XCTAssertEqual(EnvelopeCodec.decode(#""request""#), .dropped(.notAnObject))
        XCTAssertEqual(EnvelopeCodec.decode("null"), .dropped(.notAnObject))
    }

    func testDropsAMessageWithNoReadableId() throws {
        for idText in [nil, "null", "7", "\"\"", "[\"\(id)\"]", "true"] {
            XCTAssertEqual(EnvelopeCodec.decode(try request([("id", idText)])), .dropped(.noReadableId))
            XCTAssertEqual(EnvelopeCodec.decode(try cancel([("id", idText)])), .dropped(.noReadableId))
        }
        XCTAssertEqual(EnvelopeCodec.decode("{}"), .dropped(.noReadableId))
    }

    func testDropsAMessageThatIsNotARequestOrACancel() throws {
        for type in [nil, "null", "\"response\"", "\"event\"", "\"Request\"", "7"] {
            XCTAssertEqual(EnvelopeCodec.decode(try request([("type", type)])), .dropped(.notARequestOrCancel))
        }
    }

    func testARequestFieldThatIsMissingNullOrOfTheWrongTypeIsInvalid() throws {
        let wrong: [(String, [String?])] = [
            ("version", [nil, "null", "\"2\"", "2.5", "true", "9007199254740994"]),
            ("domain", [nil, "null", "7", "\"\"", "[]"]),
            ("method", [nil, "null", "7", "\"\"", "{}"]),
            ("params", [nil, "null", "[]", "\"{}\"", "0"]),
            ("timestamp", [nil, "null", "\"now\"", "true", "{}"])
        ]
        for (field, values) in wrong {
            let expected = invalid(
                field,
                version: field == "version" ? nil : 2,
                domain: field == "domain" ? nil : "secureStorage",
                method: field == "method" ? nil : "has"
            )
            for value in values {
                let message = EnvelopeCodec.decode(try request([(field, value)]))
                XCTAssertEqual(message, expected, "\(field) = \(value ?? "absent")")
            }
        }
    }

    func testNamesTheFirstFieldAtFaultInEnvelopeOrder() throws {
        XCTAssertEqual(
            EnvelopeCodec.decode(try request([("timestamp", nil), ("method", "7"), ("version", nil)])),
            invalid("version", version: nil, method: nil)
        )
        let badParams = ("params", "[]")
        XCTAssertEqual(EnvelopeCodec.decode(try request([badParams, ("domain", nil)])), invalid("domain", domain: nil))
        XCTAssertEqual(EnvelopeCodec.decode(try request([badParams, ("method", nil)])), invalid("method", method: nil))
        XCTAssertEqual(EnvelopeCodec.decode(try request([badParams, ("timestamp", "\"now\"")])), invalid("params"))
    }

    func testAnInvalidRequestGivesTheInvalidParamsErrorWithTheField() {
        let error = InvalidRequest(requestId: id, field: "params").error

        XCTAssertEqual(error.code, .invalidParams)
        XCTAssertEqual(error.details, BridgeErrorDetails(field: "params"))
    }

    func testReadsACancelAndItsReason() throws {
        func reason(_ json: String?) throws -> BridgeCancelReason? {
            guard case .cancel(let cancel) = EnvelopeCodec.decode(try cancel([("reason", json)])) else {
                throw XCTSkip("not a cancel")
            }
            return cancel.reason
        }

        XCTAssertEqual(
            EnvelopeCodec.decode(try cancel()),
            .cancel(
                BridgeCancel(
                    version: 2, id: id, domain: "secureStorage", requestId: otherId, reason: .user,
                    timestamp: 1_794_650_000_000
                )
            )
        )
        XCTAssertEqual(try reason("\"navigation\""), .navigation)
        XCTAssertEqual(try reason("\"timeout\""), .timeout)
        for json in [nil, "null", "\"other\"", "7"] {
            XCTAssertNil(try reason(json))
        }
    }

    func testDropsACancelWithARequiredFieldAtFault() throws {
        let wrong: [(String, String?)] = [
            ("version", "\"2\""), ("domain", nil), ("requestId", nil), ("requestId", "7"), ("timestamp", "null")
        ]
        for change in wrong {
            XCTAssertEqual(EnvelopeCodec.decode(try cancel([change])), .dropped(.invalidCancel), change.0)
        }
    }

    func testWritesAResponseWithData() throws {
        let response = BridgeResponse(
            version: 2,
            id: otherId,
            domain: "secureStorage",
            requestId: id,
            success: true,
            data: .object(["exists": .bool(true), "protection": .string("userPresence")]),
            timestamp: 1_794_650_000_012
        )

        XCTAssertEqual(
            try EnvelopeCodec.encode(response),
            #"{"data":{"exists":true,"protection":"userPresence"},"domain":"secureStorage","#
                + "\"id\":\"\(otherId)\",\"requestId\":\"\(id)\",\"success\":true,\"timestamp\":1794650000012,"
                + #""type":"response","version":2}"#
        )
    }

    private func bareResponse(success: Bool = true) -> BridgeResponse {
        BridgeResponse(version: 2, id: otherId, domain: "lifecycle", requestId: id, success: success, timestamp: 5)
    }

    private func errorText(_ error: BridgeError) throws -> String {
        var response = bareResponse(success: false)
        response.error = error
        let fields = try XCTUnwrap(JSONText.parse(try EnvelopeCodec.encode(response)).fields)
        return try JSONText.write(try XCTUnwrap(fields["error"]))
    }

    func testLeavesOutAnOptionalFieldThatHasNoValue() throws {
        let bare =
            "{\"domain\":\"lifecycle\",\"id\":\"\(otherId)\",\"requestId\":\"\(id)\",\"success\":true,\"timestamp\":5,"
            + "\"type\":\"response\",\"version\":2}"
        var withNullData = bareResponse()
        withNullData.data = .null

        XCTAssertEqual(try EnvelopeCodec.encode(bareResponse()), bare)
        XCTAssertEqual(try EnvelopeCodec.encode(withNullData), bare)
        XCTAssertEqual(
            try errorText(BridgeError(code: .cancelled, message: "m")),
            #"{"code":"CANCELLED","message":"m"}"#
        )
        XCTAssertEqual(
            try errorText(BridgeError(code: .cancelled, message: "m", details: BridgeErrorDetails())),
            #"{"code":"CANCELLED","message":"m"}"#
        )
    }

    func testWritesAnErrorWithItsDetails() throws {
        let details = BridgeErrorDetails(
            reason: "nfc_disabled", field: "params", supported: [2], origin: .native, permission: "camera",
            canAskAgain: false
        )

        XCTAssertEqual(
            try errorText(BridgeError(code: .unavailable, message: "it's off", details: details)),
            #"{"code":"UNAVAILABLE","details":{"canAskAgain":false,"field":"params","origin":"native","#
                + #""permission":"camera","reason":"nfc_disabled","supported":[2]},"message":"it's off"}"#
        )
    }

    func testRefusesAResponseWhoseSuccessAndErrorDisagree() {
        var successWithError = bareResponse()
        successWithError.error = BridgeError(code: .failed, message: "m")
        var notFinite = bareResponse()
        notFinite.data = .number(.nan)

        XCTAssertThrowsError(try EnvelopeCodec.encode(successWithError)) {
            XCTAssertEqual($0 as? EnvelopeEncodingError, .successAndErrorDisagree)
        }
        XCTAssertThrowsError(try EnvelopeCodec.encode(bareResponse(success: false))) {
            XCTAssertEqual($0 as? EnvelopeEncodingError, .successAndErrorDisagree)
        }
        XCTAssertThrowsError(try EnvelopeCodec.encode(notFinite)) {
            XCTAssertEqual($0 as? EnvelopeEncodingError, .numberNotFinite)
        }
    }

    func testWritesAnEventWithAndWithoutARequestId() throws {
        let progress = BridgeEvent(
            version: 2, id: otherId, domain: "nfc", event: "scanProgress", requestId: id,
            data: ["percent": .number(40)], timestamp: 1_794_650_003_500
        )
        let back = BridgeEvent(version: 2, id: otherId, domain: "navigation", event: "back", data: [:], timestamp: 0.5)

        XCTAssertEqual(
            try EnvelopeCodec.encode(progress),
            "{\"data\":{\"percent\":40},\"domain\":\"nfc\",\"event\":\"scanProgress\",\"id\":\"\(otherId)\","
                + "\"requestId\":\"\(id)\",\"timestamp\":1794650003500,\"type\":\"event\",\"version\":2}"
        )
        XCTAssertEqual(
            try EnvelopeCodec.encode(back),
            "{\"data\":{},\"domain\":\"navigation\",\"event\":\"back\",\"id\":\"\(otherId)\",\"timestamp\":0.5,"
                + "\"type\":\"event\",\"version\":2}"
        )
    }
}
