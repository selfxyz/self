// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation
import XCTest

@testable import SelfSdk

/// The text a correct native emits for an `expect`: the typed message with the fields of the
/// `expect`, written by the codec. It lets the codec's writer be checked against a fixture before a
/// router exists to emit the message.
enum ExpectedMessage {
    static func encode(_ expect: JSONFields) throws -> String {
        guard case .number(let versionNumber) = expect["version"] else { throw FixtureFormatError(message: "version") }
        let version = try XCTUnwrap(JSONText.wholeNumber(versionNumber))
        let domain = try XCTUnwrap(expect["domain"]?.text)
        let id = UUID().uuidString.lowercased()
        switch expect["type"]?.text {
        case "response":
            let response = BridgeResponse(
                version: version,
                id: id,
                domain: domain,
                requestId: try XCTUnwrap(expect["requestId"]?.text),
                success: expect["success"] == .bool(true),
                data: expect["data"],
                error: try expect["error"]?.fields.map(error),
                timestamp: FixturePlaceholders.timestamp
            )
            return try EnvelopeCodec.encode(response)
        case "event":
            let event = BridgeEvent(
                version: version,
                id: id,
                domain: domain,
                event: try XCTUnwrap(expect["event"]?.text),
                requestId: expect["requestId"]?.text,
                data: try XCTUnwrap(expect["data"]?.fields),
                timestamp: FixturePlaceholders.timestamp
            )
            return try EnvelopeCodec.encode(event)
        default:
            throw FixtureFormatError(message: "An expect must be a response or an event")
        }
    }

    private static func error(_ fields: JSONFields) throws -> BridgeError {
        let details = fields["details"]?.fields.map { details in
            BridgeErrorDetails(
                reason: details["reason"]?.text,
                field: details["field"]?.text,
                supported: details["supported"]?.items?.compactMap { major -> Int? in
                    guard case .number(let number) = major else { return nil }
                    return JSONText.wholeNumber(number)
                },
                origin: details["origin"]?.text.flatMap(BridgeErrorOrigin.init(rawValue:)),
                permission: details["permission"]?.text,
                canAskAgain: details["canAskAgain"].flatMap { $0 == .null ? nil : $0 == .bool(true) }
            )
        }
        let code = try XCTUnwrap(fields["code"]?.text.flatMap(BridgeErrorCode.init(rawValue:)))
        return BridgeError(code: code, message: "for logs", details: details)
    }
}
