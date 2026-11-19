// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

/// Answers each send with the texts `makeAnswer` gives for the id of the message.
private final class AnsweringSubject: FixtureSubject {
    private(set) var sent: [String] = []
    private var emitted: [String] = []
    private let makeAnswer: (String) throws -> [String]

    init(_ makeAnswer: @escaping (String) throws -> [String]) {
        self.makeAnswer = makeAnswer
    }

    func send(_ body: String) throws {
        sent.append(body)
        emitted += try makeAnswer(try XCTUnwrap(JSONText.parse(body).fields?["id"]?.text))
    }

    func native(_ action: String) {}

    func advance(_ milliseconds: Int) {}

    func drain() -> [String] {
        defer { emitted = [] }
        return emitted
    }
}

/// The Kotlin library has the same cases in `FixtureRunnerTest`. Change both together.
final class FixtureRunnerTests: XCTestCase {
    private let request =
        #"{"type":"request","version":2,"id":"r1","domain":"nfc","method":"getStatus","params":{},"timestamp":0}"#
    private let expect =
        #"{"type":"response","version":2,"domain":"nfc","requestId":"r1","success":false,"data":null,"#
        + #""error":{"code":"UNAVAILABLE","details":{"reason":"nfc_disabled"},"retryAfterMs":0},"durationMs":12}"#

    private func parse(_ text: String) throws -> Fixture {
        try FixtureParser.parse(try JSONText.parse(text), source: "test")
    }

    private func fields(_ text: String) throws -> JSONFields {
        try XCTUnwrap(JSONText.parse(text).fields)
    }

    private func fixture() throws -> Fixture {
        let steps = "[{\"send\":\(request)},{\"expect\":\(expect)}]"
        return try parse("{\"name\":\"a/b\",\"given\":{\"capabilities\":\"full\"},\"steps\":\(steps)}")
    }

    private func answer(_ requestId: String, _ changes: String = "") throws -> String {
        let base =
            "{\"type\":\"response\",\"version\":2,\"id\":\"x\",\"domain\":\"nfc\",\"requestId\":\"\(requestId)\","
            + #""success":false,"error":{"code":"UNAVAILABLE","message":"off","#
            + #""details":{"reason":"nfc_disabled","nativeCode":3}},"timestamp":9}"#
        return try JSONText.write(.object(try fields(base).merging(try fields("{\(changes)}")) { $1 }))
    }

    private func run(_ makeAnswer: @escaping (String) throws -> [String]) throws -> FixtureOutcome {
        try FixtureRunner.run(try fixture(), AnsweringSubject(makeAnswer))
    }

    private func outcome(_ changes: String) throws -> FixtureOutcome {
        try run { [try self.answer($0, changes)] }
    }

    func testLoadsEveryFixtureCopy() throws {
        let fixtures = try FixtureLoader.loadAll()
        let names = fixtures.map(\.name)

        let groups = Set(fixtures.map(\.group))

        XCTAssertTrue(groups.isSuperset(of: ["envelope", "envelope-invalid", "handshake", "version"]))
        XCTAssertEqual(names, names.sorted())
        XCTAssertEqual(
            fixtures.first { $0.name == "envelope-invalid/not-an-object" }?.steps, [.sendRaw(#"["request"]"#)])
        XCTAssertEqual(
            fixtures.first { $0.name == "envelope/unknown-fields" }.map { Array($0.given.provider.keys) },
            ["nfc.scanPassport"]
        )
    }

    func testPassesWhenNativeEmitsEachExpectAndNothingElse() throws {
        XCTAssertEqual(try outcome(""), .passed)
    }

    func testSendsTheMessageWithItsPlaceholdersFilled() throws {
        let subject = AnsweringSubject { _ in [] }
        _ = try FixtureRunner.run(try fixture(), subject)
        var sent = try fields(try XCTUnwrap(subject.sent.first))
        var expected = try fields(request)

        XCTAssertEqual(subject.sent.count, 1)
        XCTAssertEqual(sent["timestamp"], .number(1_794_650_000_000))
        XCTAssertNotEqual(sent["id"], .string("r1"))
        for field in ["id", "timestamp"] {
            sent[field] = nil
            expected[field] = nil
        }
        XCTAssertEqual(sent, expected)
    }

    func testIgnoresWhatAnExpectDoesNotList() throws {
        XCTAssertEqual(try outcome(#""id":"other","timestamp":1,"extra":true"#), .passed)
    }

    func testFailsOnADifferentValueOfAContractField() throws {
        XCTAssertEqual(
            try outcome(#""domain":"camera""#), .failed([#"steps[1]: domain: expected "nfc", got "camera""#]))
        guard case .failed(let problems) = try run({ _ in [try self.answer("another-id")] }) else {
            return XCTFail("another request id must not pass")
        }
        XCTAssertEqual(problems.count, 1)
        XCTAssertEqual(
            try outcome(#""error":{"code":"FAILED","message":"m","details":{"reason":"nfc_disabled"}}"#),
            .failed([#"steps[1]: error.code: expected "UNAVAILABLE", got "FAILED""#])
        )
        XCTAssertEqual(
            try outcome(#""error":{"code":"UNAVAILABLE","message":"m"}"#),
            .failed([#"steps[1]: error.details.reason: expected "nfc_disabled", got null"#])
        )
    }

    func testANullInAnExpectMeansNativeEmitsNoValue() throws {
        XCTAssertEqual(try outcome(#""data":null"#), .passed)
        XCTAssertEqual(try outcome(#""data":{}"#), .failed(["steps[1]: data: expected null, got {}"]))
    }

    func testFailsWhenNativeEmitsNothingTooMuchOrTextThatIsNotAnObject() throws {
        XCTAssertEqual(try run { _ in [] }, .failed(["steps[1]: native emitted nothing"]))
        guard case .failed(let problems) = try run({ [try self.answer($0), try self.answer($0)] }) else {
            return XCTFail("a second answer must not pass")
        }
        XCTAssertEqual(problems.count, 1)
        XCTAssertEqual(try run { _ in ["[]"] }, .failed(["steps[1]: native emitted text that is not a JSON object"]))
    }

    func testReportsAStepTheSubjectCannotRunAsDeferred() throws {
        let native = try parse(
            #"{"name":"a/b","given":{"capabilities":"full"},"steps":[{"send":"x"},{"native":"system_back"}]}"#)

        XCTAssertEqual(
            try FixtureRunner.run(native, try RouterFixtureSubject(native.given)),
            .deferred(stepIndex: 1, why: "the native action system_back needs its handler")
        )
    }

    func testReadsEachStepKindAndTheGivenPart() throws {
        let read = try parse(
            #"{"name":"nfc/scan-1","given":{"capabilities":"full","#
                + #""provider":{"nfc.scanPassport":{"progress":[{}],"pending":true}},"launch":{"mode":"embed"}},"#
                + #""steps":[{"send":{}},{"send":"raw"},{"expect":{}},{"native":"system_back"},{"advance":1}]}"#
        )

        XCTAssertEqual(read.group, "nfc")
        XCTAssertEqual(read.given.launch, ["mode": .string("embed")])
        XCTAssertEqual(read.steps, [.send([:]), .sendRaw("raw"), .expect([:]), .native("system_back"), .advance(1)])
    }

    func testRefusesAFileThatBreaksTheFormat() {
        func fixtureWith(
            given: String = #"{"capabilities":"full"}"#, steps: String = #"[{"send":{}}]"#, name: String = #""a/b""#,
            extra: String = ""
        ) -> String {
            "{\"name\":\(name),\"given\":\(given),\"steps\":\(steps)\(extra)}"
        }
        func provider(_ setup: String) -> String {
            fixtureWith(given: "{\"capabilities\":\"full\",\"provider\":{\"nfc.scan\":\(setup)}}")
        }
        let bad = [
            "[]",
            fixtureWith(extra: #","note":1"#),
            fixtureWith(name: #""no-group""#),
            fixtureWith(name: #""a/B""#),
            fixtureWith(given: "{}"),
            fixtureWith(given: #"{"capabilities":""}"#),
            fixtureWith(given: #"{"capabilities":"full","other":1}"#),
            fixtureWith(given: #"{"capabilities":"full","launch":[]}"#),
            fixtureWith(given: #"{"capabilities":"full","launch":{"protocolVersion":2}}"#),
            fixtureWith(given: #"{"capabilities":"full","provider":{"scan":{"pending":true}}}"#),
            provider("{}"),
            provider(#"{"succeed":1}"#),
            provider(#"{"fail":""}"#),
            provider(#"{"progress":[1]}"#),
            provider(#"{"pending":false}"#),
            provider(#"{"pending":true,"fail":"x"}"#),
            fixtureWith(steps: "[]"),
            fixtureWith(steps: "[{}]"),
            fixtureWith(steps: #"[{"send":{},"expect":{}}]"#),
            fixtureWith(steps: #"[{"wait":1}]"#),
            fixtureWith(steps: #"[{"send":7}]"#),
            fixtureWith(steps: #"[{"expect":"raw"}]"#),
            fixtureWith(steps: #"[{"native":""}]"#),
            fixtureWith(steps: #"[{"advance":0}]"#),
            fixtureWith(steps: #"[{"advance":1.5}]"#)
        ]
        for text in bad {
            XCTAssertThrowsError(try parse(text), text) { XCTAssertTrue($0 is FixtureFormatError) }
        }
    }
}
