// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

/// Runs the `envelope` and `envelope-invalid` fixture groups as far as the codec goes. The Kotlin
/// library has the same table in `EnvelopeFixtureTest`. Change both together.
final class EnvelopeFixtureTests: XCTestCase {
    /// The codec alone gives the whole answer: a drop, or INVALID_PARAMS with the field.
    private let codecComplete = [
        "envelope-invalid/method-wrong-type",
        "envelope-invalid/missing-id",
        "envelope-invalid/missing-method",
        "envelope-invalid/missing-params",
        "envelope-invalid/not-an-object",
        "envelope-invalid/not-json",
        "envelope-invalid/params-array",
        "envelope-invalid/params-null",
        "envelope-invalid/timestamp-wrong-type"
    ]

    /// The first message parses, so the answer needs the router and a handler. Not run to the end yet.
    private let needsRouter = [
        "envelope-invalid/duplicate-request-id",
        "envelope-invalid/unknown-domain",
        "envelope-invalid/unknown-method",
        "envelope/cancel-reason-absent",
        "envelope/cancel-reason-null",
        "envelope/cancel-with-reason",
        "envelope/event-request-id-absent",
        "envelope/event-request-id-null",
        "envelope/event-with-request-id",
        "envelope/request-response-data",
        "envelope/response-error-details-absent",
        "envelope/response-error-details-null",
        "envelope/response-error-with-details",
        "envelope/response-optionals-absent",
        "envelope/response-optionals-null",
        "envelope/unknown-fields"
    ]

    private func fixtures() throws -> [Fixture] {
        try FixtureLoader.group("envelope") + FixtureLoader.group("envelope-invalid")
    }

    private func fixture(_ name: String) throws -> Fixture {
        try XCTUnwrap(try fixtures().first { $0.name == name }, name)
    }

    private func sends(_ fixture: Fixture) -> [JSONFields] {
        fixture.steps.compactMap {
            guard case .send(let message) = $0 else { return nil }
            return message
        }
    }

    private func expects(_ fixture: Fixture) -> [JSONFields] {
        fixture.steps.compactMap {
            guard case .expect(let message) = $0 else { return nil }
            return message
        }
    }

    func testEveryFixtureOfTheTwoGroupsIsInOneList() throws {
        XCTAssertEqual(try fixtures().map(\.name).sorted(), (codecComplete + needsRouter).sorted())
    }

    func testTheCodecAloneAnswersAnInvalidEnvelope() throws {
        for name in codecComplete {
            XCTAssertEqual(try FixtureRunner.run(try fixture(name), CodecFixtureSubject()), .passed, name)
        }
    }

    func testAFixtureWhoseFirstMessageParsesWaitsForTheRouter() throws {
        for name in needsRouter {
            XCTAssertEqual(
                try FixtureRunner.run(try fixture(name), CodecFixtureSubject()),
                .deferred(stepIndex: 0, why: "a message that parses needs the router"),
                name
            )
        }
    }

    func testEverySendOfAWaitingFixtureReadsAsTheMessageItHolds() throws {
        for name in needsRouter {
            let placeholders = FixturePlaceholders()
            for message in sends(try fixture(name)) {
                let sent = placeholders.fillSend(message)

                switch EnvelopeCodec.decode(try JSONText.write(.object(sent))) {
                case .request(let request):
                    XCTAssertEqual(sent["type"], .string("request"), name)
                    XCTAssertEqual(sent["id"], .string(request.id), name)
                    XCTAssertEqual(sent["version"], .number(Double(request.version)), name)
                    XCTAssertEqual(sent["domain"], .string(request.domain), name)
                    XCTAssertEqual(sent["method"], .string(request.method), name)
                    XCTAssertEqual(sent["params"], .object(request.params), name)
                    XCTAssertEqual(sent["timestamp"], .number(request.timestamp), name)
                case .cancel(let cancel):
                    XCTAssertEqual(sent["type"], .string("cancel"), name)
                    XCTAssertEqual(sent["id"], .string(cancel.id), name)
                    XCTAssertEqual(sent["requestId"], .string(cancel.requestId), name)
                    XCTAssertEqual(sent["domain"], .string(cancel.domain), name)
                    let reason = sent["reason"]?.text.flatMap(BridgeCancelReason.init(rawValue:))
                    XCTAssertEqual(reason, cancel.reason, name)
                case let other:
                    XCTFail("\(name): read as \(other)")
                }
            }
        }
    }

    func testTheWriterGivesAMessageThatMatchesEachExpect() throws {
        var count = 0
        for name in codecComplete + needsRouter {
            let placeholders = FixturePlaceholders()
            for message in expects(try fixture(name)) {
                let expected = placeholders.fillExpect(message)

                XCTAssertEqual(
                    FixtureMatcher.mismatches(expected, actualText: try ExpectedMessage.encode(expected)), [], name)
                count += 1
            }
        }
        XCTAssertGreaterThan(count, needsRouter.count)
    }

    func testALabelBecomesOneUUIDForTheWholeFixture() throws {
        let placeholders = FixturePlaceholders()
        let fixture = try fixture("envelope/cancel-with-reason")
        let request = placeholders.fillSend(try XCTUnwrap(sends(fixture).first))
        let cancel = placeholders.fillSend(try XCTUnwrap(sends(fixture).last))
        let response = placeholders.fillExpect(try XCTUnwrap(expects(fixture).last))
        let uuid = "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"

        XCTAssertNotNil(try XCTUnwrap(request["id"]?.text).range(of: uuid, options: .regularExpression))
        XCTAssertEqual(request["id"], cancel["requestId"])
        XCTAssertEqual(request["id"], response["requestId"])
        XCTAssertNotEqual(request["id"], cancel["id"])
        XCTAssertEqual(request["timestamp"], .number(FixturePlaceholders.timestamp))
    }
}
