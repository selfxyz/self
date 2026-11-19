// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

final class BridgeTypesTests: XCTestCase {
    func testProtocolIsMajorTwo() {
        XCTAssertEqual(BridgeProtocol.major, 2)
        XCTAssertEqual(BridgeProtocol.minor, 0)
    }

    func testEnumsCarryTheWireNames() {
        XCTAssertEqual(BridgeDomain.allCases.count, 8)
        XCTAssertEqual(BridgeErrorCode.allCases.count, 11)
        XCTAssertEqual(BridgeDomain.secureStorage.rawValue, "secureStorage")
        XCTAssertEqual(BridgeWrapper.reactNative.rawValue, "react-native")
        XCTAssertEqual(BridgeMode.selfApp.rawValue, "self-app")
        XCTAssertEqual(BridgeMessageType.allCases.map(\.rawValue), ["request", "response", "event", "cancel"])
    }

    func testRawValueFindsAKnownNameAndRejectsAnUnknownOne() {
        XCTAssertEqual(BridgeErrorCode(rawValue: "UNSUPPORTED_VERSION"), .unsupportedVersion)
        XCTAssertEqual(BridgeUserPresence(rawValue: "none"), .noneValue)
        XCTAssertNil(BridgeDomain(rawValue: "crypto"))
        XCTAssertNil(BridgeErrorCode(rawValue: "unsupported_version"))
    }

    func testOnlyThreeCodesTakeAReason() {
        let withReasons = BridgeErrorCode.allCases.filter { !$0.allowedReasons.isEmpty }

        XCTAssertEqual(withReasons, [.unsupported, .unavailable, .failed])
        XCTAssertTrue(BridgeErrorCode.unsupported.allowedReasons.contains("unknown_method"))
        XCTAssertTrue(BridgeErrorCode.unavailable.allowedReasons.contains("nfc_disabled"))
        XCTAssertTrue(BridgeErrorCode.failed.allowedReasons.contains("tag_lost"))
    }

    func testOptionalFieldsDefaultToNil() {
        let response = BridgeResponse(
            version: BridgeProtocol.major,
            id: "a",
            domain: BridgeDomain.lifecycle.rawValue,
            requestId: "b",
            success: true,
            timestamp: 0
        )
        let capability = BridgeCapability(available: true, methods: ["getConfig"], events: [])

        XCTAssertNil(response.data)
        XCTAssertNil(response.error)
        XCTAssertNil(capability.reason)
        XCTAssertNil(capability.features)
    }

    func testARequestHoldsUntypedParams() {
        let request = BridgeRequest(
            version: BridgeProtocol.major,
            id: "a",
            domain: "secureStorage",
            method: "get",
            params: ["key": .string("self_mnemonic")],
            timestamp: 0
        )

        XCTAssertEqual(JSONValue.object(request.params), .object(["key": .string("self_mnemonic")]))
    }
}
