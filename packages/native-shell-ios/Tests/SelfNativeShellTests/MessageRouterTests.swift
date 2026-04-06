// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class MessageRouterTests: XCTestCase {

    private func makeRequestJSON(
        domain: String = "secureStorage",
        method: String = "get",
        params: [String: Any]? = nil,
        version: Int = 1,
        id: String = "req-1"
    ) -> String {
        var dict: [String: Any] = [
            "type": "request",
            "version": version,
            "id": id,
            "domain": domain,
            "method": method,
            "timestamp": 1000.0
        ]
        if let params = params {
            dict["params"] = params
        }
        let data = try! JSONSerialization.data(withJSONObject: dict)
        return String(data: data, encoding: .utf8)!
    }

    // MARK: - Version validation

    func testUnsupportedVersionSendsErrorResponse() {
        let expectation = expectation(description: "response sent")
        var sentJS: String?

        let router = MessageRouter { js in
            sentJS = js
            expectation.fulfill()
        }

        router.onMessageReceived(rawJson: makeRequestJSON(version: 999))

        waitForExpectations(timeout: 2)

        XCTAssertNotNil(sentJS)
        XCTAssertTrue(sentJS!.contains("UNSUPPORTED_VERSION"))
    }

    // MARK: - Domain lookup

    func testUnknownDomainSendsErrorResponse() {
        let expectation = expectation(description: "response sent")
        var sentJS: String?

        let router = MessageRouter { js in
            sentJS = js
            expectation.fulfill()
        }

        router.onMessageReceived(rawJson: makeRequestJSON(domain: "secureStorage"))

        waitForExpectations(timeout: 2)

        XCTAssertNotNil(sentJS)
        XCTAssertTrue(sentJS!.contains("UNKNOWN_DOMAIN"))
    }

    // MARK: - Handler dispatch

    func testSuccessfulHandlerCallSendsSuccessResponse() {
        let expectation = expectation(description: "response sent")
        var sentJS: String?

        let router = MessageRouter { js in
            sentJS = js
            expectation.fulfill()
        }
        router.register(handler: StubHandler(domain: .secureStorage, result: ["value": "abc"]))

        router.onMessageReceived(rawJson: makeRequestJSON())

        waitForExpectations(timeout: 2)

        XCTAssertNotNil(sentJS)
        XCTAssertTrue(sentJS!.contains("_handleResponse"))
        XCTAssertTrue(sentJS!.contains("\"success\":true") || sentJS!.contains("\"success\" : true"))
    }

    func testHandlerErrorSendsFailureResponse() {
        let expectation = expectation(description: "response sent")
        var sentJS: String?

        let router = MessageRouter { js in
            sentJS = js
            expectation.fulfill()
        }
        router.register(handler: StubHandler(
            domain: .secureStorage,
            error: BridgeHandlerError.missingParam("key")
        ))

        router.onMessageReceived(rawJson: makeRequestJSON())

        waitForExpectations(timeout: 2)

        XCTAssertNotNil(sentJS)
        XCTAssertTrue(sentJS!.contains("MISSING_PARAM"))
    }

    func testGenericErrorSendsHandlerErrorResponse() {
        let expectation = expectation(description: "response sent")
        var sentJS: String?

        let router = MessageRouter { js in
            sentJS = js
            expectation.fulfill()
        }
        router.register(handler: StubHandler(
            domain: .secureStorage,
            error: NSError(domain: "test", code: 1, userInfo: [NSLocalizedDescriptionKey: "disk full"])
        ))

        router.onMessageReceived(rawJson: makeRequestJSON())

        waitForExpectations(timeout: 2)

        XCTAssertNotNil(sentJS)
        XCTAssertTrue(sentJS!.contains("HANDLER_ERROR"))
    }

    // MARK: - Malformed input

    func testMalformedJSONIsDropped() {
        var sentCount = 0

        let router = MessageRouter { _ in
            sentCount += 1
        }

        router.onMessageReceived(rawJson: "{not valid json")

        // Give async code a chance to run
        let expectation = expectation(description: "wait")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            expectation.fulfill()
        }
        waitForExpectations(timeout: 2)

        XCTAssertEqual(sentCount, 0)
    }

    // MARK: - Registration

    func testRegisterReplacesExistingHandler() {
        let expectation = expectation(description: "response sent")
        var sentJS: String?

        let router = MessageRouter { js in
            sentJS = js
            expectation.fulfill()
        }
        router.register(handler: StubHandler(domain: .secureStorage, result: ["value": "first"]))
        router.register(handler: StubHandler(domain: .secureStorage, result: ["value": "second"]))

        router.onMessageReceived(rawJson: makeRequestJSON())

        waitForExpectations(timeout: 2)

        XCTAssertNotNil(sentJS)
        XCTAssertTrue(sentJS!.contains("second"))
        XCTAssertFalse(sentJS!.contains("first"))
    }

    func testPushEventSerializesEventPayload() throws {
        var sentJS: String?

        let router = MessageRouter { js in
            sentJS = js
        }

        router.pushEvent(
            domain: .lifecycle,
            event: "verificationUpdated",
            data: ["success": true, "verificationId": "ver_123"]
        )

        let event = try XCTUnwrap(parseEvent(from: try XCTUnwrap(sentJS)))

        XCTAssertEqual(event["type"] as? String, "event")
        XCTAssertEqual(event["domain"] as? String, "lifecycle")
        XCTAssertEqual(event["event"] as? String, "verificationUpdated")
        let data = try XCTUnwrap(event["data"] as? [String: Any])
        XCTAssertEqual(data["success"] as? Bool, true)
        XCTAssertEqual(data["verificationId"] as? String, "ver_123")
    }

    private func parseEvent(from js: String) -> [String: Any]? {
        guard
            js.hasPrefix("window.SelfNativeBridge._handleEvent('"),
            js.hasSuffix("')")
        else {
            return nil
        }

        let startIndex = js.index(js.startIndex, offsetBy: "window.SelfNativeBridge._handleEvent('".count)
        let endIndex = js.index(js.endIndex, offsetBy: -2)
        let escaped = String(js[startIndex..<endIndex])
        let jsonString = escaped
            .replacingOccurrences(of: "\\u2028", with: "\u{2028}")
            .replacingOccurrences(of: "\\u2029", with: "\u{2029}")
            .replacingOccurrences(of: "\\r", with: "\r")
            .replacingOccurrences(of: "\\n", with: "\n")
            .replacingOccurrences(of: "\\'", with: "'")
            .replacingOccurrences(of: "\\\\", with: "\\")

        guard let data = jsonString.data(using: .utf8) else {
            return nil
        }

        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }
}

// MARK: - Test doubles

private final class StubHandler: BridgeHandler {
    let domain: BridgeDomain
    private let result: Any?
    private let error: Error?

    init(domain: BridgeDomain, result: Any? = nil, error: Error? = nil) {
        self.domain = domain
        self.result = result
        self.error = error
    }

    func handle(method: String, params: [String: Any]?) async throws -> Any? {
        if let error = error { throw error }
        return result
    }
}
