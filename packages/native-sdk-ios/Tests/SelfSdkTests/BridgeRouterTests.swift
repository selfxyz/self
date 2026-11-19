// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

/// The Kotlin library has the same cases in `BridgeRouterTest`. Change both together.
final class BridgeRouterTests: XCTestCase {
    struct Broken: Error {}

    private var clock: ManualClock!
    private var emitted: [String] = []
    private var router: BridgeRouter!
    private var calls: [BridgeCall] = []
    private var onCall: (BridgeCall) throws -> Void = { _ in }

    override func setUp() {
        super.setUp()
        clock = ManualClock()
        emitted = []
        calls = []
        onCall = { _ in }
        router = BridgeRouter(emit: { [unowned self] in emitted.append($0) }, clock: clock)
        let keep: BridgeMethodHandler = { [unowned self] call in
            calls.append(call)
            try onCall(call)
        }
        router.register("nfc", ["scanPassport": keep, "getStatus": keep])
        router.register("camera", ["scanMRZ": keep])
        router.register("lifecycle", ["dismiss": keep])
        router.registerUnavailable("haptic", .noHardware)
    }

    private func send(_ id: String, _ method: String = "nfc.scanPassport", params: String = "{}", version: Int = 2) {
        let parts = method.split(separator: ".")
        router.receive(
            #"{"type":"request","version":\#(version),"id":"\#(id)","domain":"\#(parts[0])","method":"\#(parts[1])","#
                + #""params":\#(params),"timestamp":1}"#)
    }

    private func cancel(_ requestId: String) {
        router.receive(
            #"{"type":"cancel","version":2,"id":"c-\#(requestId)","domain":"nfc","#
                + #""requestId":"\#(requestId)","timestamp":1}"#)
    }

    private func drain() throws -> [JSONFields] {
        defer { emitted = [] }
        return try emitted.map { try XCTUnwrap(try JSONText.parse($0).fields) }
    }

    /// The one message emitted since the last drain: the answer to `requestId` with `code`, or a success when nil.
    @discardableResult
    private func assertAnswer(_ requestId: String, _ code: String?, line: UInt = #line) throws -> JSONFields {
        let messages = try drain()
        XCTAssertEqual(messages.count, 1, "\(messages)", line: line)
        let message = try XCTUnwrap(messages.first, line: line)
        XCTAssertEqual(message["type"], .string("response"), line: line)
        XCTAssertEqual(message["requestId"], .string(requestId), line: line)
        XCTAssertEqual(message["error"]?.fields?["code"]?.text, code, line: line)
        XCTAssertEqual(message["success"], .bool(code == nil), line: line)
        return message
    }

    private func details(_ message: JSONFields) -> JSONFields {
        message["error"]?.fields?["details"]?.fields ?? [:]
    }

    func testAnswersEachRequestExactlyOnce() throws {
        send("r1", "nfc.getStatus")

        XCTAssertTrue(calls[0].succeed(.object(["enabled": .bool(true)])))
        XCTAssertFalse(calls[0].fail(Broken()))
        XCTAssertFalse(calls[0].succeed())
        XCTAssertEqual(try assertAnswer("r1", nil)["data"], .object(["enabled": .bool(true)]))
    }

    func testAnEventCarriesTheRequestIdAndStopsAfterTheAnswer() throws {
        send("r1")
        XCTAssertTrue(calls[0].emit("scanProgress", ["percent": .number(10)]))
        let event = try XCTUnwrap(try drain().first)
        calls[0].succeed()
        _ = try drain()

        XCTAssertEqual(event["type"], .string("event"))
        XCTAssertEqual(event["requestId"], .string("r1"))
        XCTAssertFalse(calls[0].emit("scanProgress"))
        XCTAssertEqual(emitted, [])
    }

    func testACancelWithNoStopActionAnswersAtOnceAndDropsTheLateOutcome() throws {
        send("r1")
        cancel("r1")

        XCTAssertEqual(details(try assertAnswer("r1", "CANCELLED"))["origin"], .string("native"))
        XCTAssertFalse(calls[0].succeed())
        XCTAssertEqual(emitted, [])
    }

    func testACancelRunsTheStopActionAndAnswersWhenTheHandlerDoes() throws {
        var stops = 0
        onCall = { call in
            call.onStop {
                stops += 1
                call.succeed()
            }
        }
        send("r1")
        cancel("r1")

        XCTAssertEqual(stops, 1)
        try assertAnswer("r1", "CANCELLED")
        XCTAssertEqual(clock.activeTimers, 0)
    }

    func testACancelIsAnsweredWithin2000MsWhenTheHandlerDoesNotStop() throws {
        onCall = { call in call.onStop {} }
        send("r1")
        cancel("r1")
        XCTAssertFalse(calls[0].emit("scanProgress"))

        clock.advance(1_999)
        XCTAssertEqual(emitted, [])
        clock.advance(1)
        try assertAnswer("r1", "CANCELLED")
        XCTAssertFalse(calls[0].fail(Broken()))
    }

    func testAStopActionSetAfterTheRequestEndedRunsAtOnce() throws {
        var stopped = false
        send("r1")
        cancel("r1")
        calls[0].onStop { stopped = true }

        XCTAssertTrue(stopped)
        try assertAnswer("r1", "CANCELLED")
    }

    func testACancelForAnUnknownOrFinishedRequestAndASecondCancelAreIgnored() throws {
        cancel("r9")
        send("r1", "nfc.getStatus")
        calls[0].succeed()
        try assertAnswer("r1", nil)
        cancel("r1")
        send("r2")
        cancel("r2")
        cancel("r2")

        try assertAnswer("r2", "CANCELLED")
    }

    func testADuplicateIdIsRefusedAndTheFirstRequestContinues() throws {
        send("r1")
        send("r1")

        XCTAssertEqual(details(try assertAnswer("r1", "INVALID_PARAMS"))["field"], .string("id"))
        XCTAssertEqual(calls.count, 1)
        calls[0].succeed()
        try assertAnswer("r1", nil)
    }

    func testASecondScanInTheSameDomainIsBusyAndAScanInAnotherDomainIsNot() throws {
        send("r1")
        send("r2")
        try assertAnswer("r2", "BUSY")
        send("r3", "camera.scanMRZ")
        send("r4", "nfc.getStatus")
        XCTAssertEqual(calls.count, 3)

        calls[0].succeed()
        try assertAnswer("r1", nil)
        send("r5")
        XCTAssertEqual(calls.count, 4)
    }

    func testANativeOwnedTimeoutUsesTheDefaultOrTimeoutMs() throws {
        send("r1")
        clock.advance(119_999)
        XCTAssertEqual(emitted, [])
        clock.advance(1)
        XCTAssertEqual(details(try assertAnswer("r1", "TIMEOUT"))["origin"], .string("native"))

        send("r2", params: #"{"timeoutMs":500}"#)
        clock.advance(500)
        try assertAnswer("r2", "TIMEOUT")
    }

    func testTheTimerStopsWhenTheRequestIsAnswered() {
        send("r1")
        calls[0].succeed()

        XCTAssertEqual(clock.activeTimers, 0)
    }

    func testATimeoutOfZeroAndAWebOwnedMethodSetNoTimer() {
        send("r1", params: #"{"timeoutMs":0}"#)
        send("r2", "camera.scanMRZ")
        send("r3", "nfc.getStatus", params: #"{"timeoutMs":5}"#)

        XCTAssertEqual(clock.activeTimers, 0)
        clock.advance(1_000_000)
        XCTAssertEqual(emitted, [])
    }

    func testAnInvalidTimeoutMsIsRefused() throws {
        for (index, value) in [#""soon""#, "-1", "1.5", "true"].enumerated() {
            send("r\(index)", params: #"{"timeoutMs":\#(value)}"#)

            let answer = try assertAnswer("r\(index)", "INVALID_PARAMS")
            XCTAssertEqual(details(answer)["field"], .string("timeoutMs"), value)
        }
        XCTAssertEqual(calls.count, 0)
    }

    func testAnUnknownDomainOrMethodOrAnUnavailableDomainIsUnsupported() throws {
        send("r1", "wallet.open")
        XCTAssertEqual(details(try assertAnswer("r1", "UNSUPPORTED"))["reason"], .string("unknown_domain"))
        send("r2", "nfc.scan")
        XCTAssertEqual(details(try assertAnswer("r2", "UNSUPPORTED"))["reason"], .string("unknown_method"))
        send("r3", "haptic.trigger")
        XCTAssertEqual(details(try assertAnswer("r3", "UNSUPPORTED"))["reason"], .string("no_hardware"))
    }

    func testAWrongMajorIsRefusedExceptForDismiss() throws {
        send("r1", "nfc.getStatus", version: 3)
        let answer = try assertAnswer("r1", "UNSUPPORTED_VERSION")
        XCTAssertEqual(answer["version"], .number(2))
        XCTAssertEqual(details(answer)["supported"], .array([.number(2)]))

        send("r2", "lifecycle.dismiss", params: #"{"reason":"user_cancel"}"#, version: 1)
        XCTAssertEqual(calls.map(\.method), ["dismiss"])
    }

    func testAnInvalidRequestAtAWrongMajorIsRefusedForTheMajor() throws {
        router.receive(#"{"type":"request","version":3,"id":"r1","domain":"nfc","method":"getStatus","timestamp":1}"#)
        try assertAnswer("r1", "UNSUPPORTED_VERSION")

        router.receive(#"{"type":"request","version":2,"id":"r2","method":"getStatus","params":{},"timestamp":1}"#)
        let answer = try assertAnswer("r2", "INVALID_PARAMS")
        XCTAssertEqual(details(answer)["field"], .string("domain"))
        XCTAssertEqual(answer["domain"], .string("lifecycle"))
    }

    func testDismissCancelsEveryOtherPendingRequestFirst() throws {
        send("r1")
        send("r2", "camera.scanMRZ")
        send("r3", "lifecycle.dismiss", params: #"{"reason":"user_cancel"}"#)

        XCTAssertEqual(try drain().map { $0["requestId"]?.text }, ["r1", "r2"])
        XCTAssertEqual(calls.last?.method, "dismiss")
    }

    func testCancelActiveScanStopsTheScanOfThatDomainOnly() throws {
        send("r1")
        send("r2", "nfc.getStatus")
        send("r3", "camera.scanMRZ")
        router.cancelActiveScan("nfc")

        try assertAnswer("r1", "CANCELLED")
    }

    func testCancelAllEndsEveryPendingRequest() throws {
        send("r1")
        send("r2", "camera.scanMRZ")
        router.cancelAll()

        XCTAssertEqual(try drain().map { $0["error"]?.fields?["code"]?.text }, ["CANCELLED", "CANCELLED"])
    }

    func testAPageChangeStopsTheWorkAndSendsNothing() {
        var stops = 0
        onCall = { call in call.onStop { stops += 1 } }
        send("r1")
        send("r2", "camera.scanMRZ")
        router.pageChanged()

        XCTAssertEqual(stops, 2)
        XCTAssertFalse(calls[0].succeed())
        XCTAssertFalse(calls[0].emit("scanProgress"))
        clock.advance(1_000_000)
        XCTAssertEqual(emitted, [])
        send("r1")
        XCTAssertEqual(calls.count, 3)
    }
}

/// Error mapping (BC 7.2).
extension BridgeRouterTests {
    func testAFailureKeepsItsCodeAndAnyOtherErrorIsAnInternalError() throws {
        send("r1", "nfc.getStatus")
        calls.last?.fail(try XCTUnwrap(BridgeFailure.forReason("nfc_disabled", message: "off")))
        XCTAssertEqual(details(try assertAnswer("r1", "UNAVAILABLE"))["reason"], .string("nfc_disabled"))

        send("r2", "nfc.getStatus")
        calls.last?.fail(NSError(domain: "secret text", code: 1))
        let error = try XCTUnwrap(try assertAnswer("r2", "INTERNAL_ERROR")["error"]?.fields)
        XCTAssertFalse(try XCTUnwrap(error["message"]?.text).contains("secret"))

        onCall = { _ in throw Broken() }
        send("r3", "nfc.getStatus")
        try assertAnswer("r3", "INTERNAL_ERROR")
    }

    func testAResultThatIsNotValidJSONIsAnInternalError() throws {
        send("r1", "nfc.getStatus")
        calls[0].succeed(.number(.nan))

        try assertAnswer("r1", "INTERNAL_ERROR")
    }

    func testEachReasonMapsToTheOneCodeThatListsItAndAWrongReasonIsRefused() {
        for code in BridgeErrorCode.allCases {
            for reason in code.allowedReasons {
                XCTAssertEqual(BridgeFailure.forReason(reason, message: "m")?.error.code, code, reason)
            }
        }
        XCTAssertNil(BridgeFailure.forReason("something_else", message: "m"))
        let wrongReason = BridgeErrorDetails(reason: "nfc_disabled")
        XCTAssertNil(BridgeFailure(BridgeError(code: .failed, message: "m", details: wrongReason)))
    }
}
