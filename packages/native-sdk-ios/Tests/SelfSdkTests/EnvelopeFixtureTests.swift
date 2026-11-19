// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

/// Checks the codec against the `envelope` and `envelope-invalid` fixture groups. `RouterFixtureTests`
/// runs the same fixtures through the router. The Kotlin library has the same cases in
/// `EnvelopeFixtureTest`. Change both together.
final class EnvelopeFixtureTests: XCTestCase {
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

    /// The fixtures whose every `send` is a JSON request or cancel the codec reads.
    private func parsing() throws -> [Fixture] {
        try fixtures().filter { fixture in
            try fixture.steps.allSatisfy { step in
                switch step {
                case .sendRaw: return false
                case .send(let message):
                    switch EnvelopeCodec.decode(try JSONText.write(.object(FixturePlaceholders().fillSend(message)))) {
                    case .request, .cancel: return true
                    default: return false
                    }
                default: return true
                }
            }
        }
    }

    func testEverySendThatParsesReadsAsTheMessageItHolds() throws {
        XCTAssertEqual(try parsing().count, 16)
        for name in try parsing().map(\.name) {
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
        for name in try fixtures().map(\.name) {
            let placeholders = FixturePlaceholders()
            for message in expects(try fixture(name)) {
                let expected = placeholders.fillExpect(message)

                XCTAssertEqual(
                    FixtureMatcher.mismatches(expected, actualText: try ExpectedMessage.encode(expected)), [], name)
                count += 1
            }
        }
        XCTAssertGreaterThan(count, try parsing().count)
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
