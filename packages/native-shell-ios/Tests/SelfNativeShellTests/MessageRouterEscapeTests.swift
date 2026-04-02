// SPDX-License-Identifier: BUSL-1.1

import XCTest
@testable import SelfNativeShell

final class MessageRouterEscapeTests: XCTestCase {

    func testPushEventEscapesBackslashesQuotesAndLineBreaks() {
        var sentJS: String?
        let router = MessageRouter { js in
            sentJS = js
        }

        router.pushEvent(domain: .lifecycle, event: "status", data: "path\\to'file\nnext\rline")

        let js = try! XCTUnwrap(sentJS)
        XCTAssertTrue(js.contains("path\\\\\\\\to\\'file\\\\nnext\\\\rline"))
    }

    func testPushEventEscapesUnicodeLineSeparators() {
        var sentJS: String?
        let router = MessageRouter { js in
            sentJS = js
        }

        router.pushEvent(domain: .lifecycle, event: "status", data: "before\u{2028}middle\u{2029}after")

        let js = try! XCTUnwrap(sentJS)
        XCTAssertTrue(js.contains("before\\u2028middle\\u2029after"))
    }

    func testResponseEscapesPayloadForJavaScript() {
        let expectation = expectation(description: "response sent")
        var sentJS: String?
        let router = MessageRouter { js in
            sentJS = js
            expectation.fulfill()
        }
        router.register(
            handler: EscapingStubHandler(
                result: ["value": "path\\to'file\nbefore\u{2028}after"]
            )
        )

        router.onMessageReceived(
            rawJson: """
            {"type":"request","version":1,"id":"req-1","domain":"secureStorage","method":"get","timestamp":1000}
            """
        )

        waitForExpectations(timeout: 2)

        let js = try! XCTUnwrap(sentJS)
        XCTAssertTrue(js.contains("path\\\\\\\\to\\'file\\\\nbefore\\u2028after"))
    }
}

private final class EscapingStubHandler: BridgeHandler {
    let domain: BridgeDomain = .secureStorage
    private let result: Any?

    init(result: Any?) {
        self.result = result
    }

    func handle(method: String, params: [String: Any]?) async throws -> Any? {
        result
    }
}
