// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

#if canImport(JavaScriptCore)
    import JavaScriptCore
#endif

/// The same vectors as `EnvelopeScriptTest` in the Kotlin library. Change both together.
final class EnvelopeScriptTests: XCTestCase {
    private let vectors: [(json: String, escaped: String)] = [
        (#"{"a":1}"#, #"{"a":1}"#),
        (#"{"a":"it's"}"#, #"{"a":"it\'s"}"#),
        (#"{"a":"back\\slash \"quoted\""}"#, #"{"a":"back\\\\slash \\"quoted\\""}"#),
        (#"{"a":"line\nbreak\r"}"#, #"{"a":"line\\nbreak\\r"}"#),
        ("{\n\"a\": 1\r\n}", #"{\n"a": 1\r\n}"#),
        ("{\"a\":\"x\u{2028}y\u{2029}z\"}", #"{"a":"x\u2028y\u2029z"}"#),
        (#"{"a":"x\u2028y"}"#, #"{"a":"x\\u2028y"}"#),
        ("{\"a\":\"h\u{e9}llo \u{65e5}\u{672c} \u{1F600}\"}", "{\"a\":\"h\u{e9}llo \u{65e5}\u{672c} \u{1F600}\"}"),
        (#"{"a":"\\'"}"#, #"{"a":"\\\\\'"}"#)
    ]

    func testEscapesInOnePass() {
        for vector in vectors {
            XCTAssertEqual(BridgeScript.escape(vector.json), vector.escaped)
        }
    }

    func testWrapsAResponseAndAnEvent() {
        let json = #"{"a":"it's"}"#

        XCTAssertEqual(BridgeScript.response(json), #"window.SelfNativeBridge._handleResponse('{"a":"it\'s"}')"#)
        XCTAssertEqual(BridgeScript.event(json), #"window.SelfNativeBridge._handleEvent('{"a":"it\'s"}')"#)
    }

    func testAScriptHoldsNoLineEnd() throws {
        let script = BridgeScript.response(try JSONText.write(.string("a'b\nc\rd\u{2028}e\u{2029}f\\")))

        XCTAssertFalse(script.unicodeScalars.contains { ["\n", "\r", "\u{2028}", "\u{2029}"].contains($0) })
    }

    #if canImport(JavaScriptCore)
        /// Evaluates a script the way a page would get it, and returns what each handler was called with.
        private func deliver(_ script: String) throws -> (responses: [String], events: [String]) {
            let context = try XCTUnwrap(JSContext())
            context.evaluateScript(
                """
                var responses = [], events = [];
                var window = { SelfNativeBridge: {
                    _handleResponse: function (json) { responses.push(json); },
                    _handleEvent: function (json) { events.push(json); }
                } };
                """
            )
            context.evaluateScript(script)
            XCTAssertNil(context.exception, script)
            let responses = try XCTUnwrap(context.objectForKeyedSubscript("responses").toArray() as? [String])
            let events = try XCTUnwrap(context.objectForKeyedSubscript("events").toArray() as? [String])
            return (responses, events)
        }

        func testAJavaScriptEngineGetsTheJSONTextBackUnchanged() throws {
            for vector in vectors {
                let delivered = try deliver(BridgeScript.response(vector.json))
                XCTAssertEqual(delivered.responses, [vector.json])
                XCTAssertEqual(delivered.events, [])

                XCTAssertEqual(try deliver(BridgeScript.event(vector.json)).events, [vector.json])
            }
        }

        func testTheWebSideParsesAnEncodedResponseToTheSameData() throws {
            let text = "it's \"quoted\" \\ \n \r \u{2028} \u{2029} \u{1F600} \u{e9} </script> \u{01} \\u2028 \\' ${x} `"
            let response = BridgeResponse(
                version: 2,
                id: "5a0c8f0d-33a1-4a7e-8f55-0c1d2e3f4a5b",
                domain: "secureStorage",
                requestId: "0b6c1d0e-7f1a-4c53-9a55-2f1f2a9f6f01",
                success: true,
                data: .object(["value": .string(text), "it's": .array([.number(1.5), .null])]),
                timestamp: 1_794_650_000_012
            )
            let json = try EnvelopeCodec.encode(response)
            let context = try XCTUnwrap(JSContext())
            context.evaluateScript(
                """
                var parsed;
                var window = { SelfNativeBridge: { _handleResponse: function (json) { parsed = JSON.parse(json); } } };
                """
            )

            context.evaluateScript(BridgeScript.response(json))

            XCTAssertNil(context.exception)
            XCTAssertEqual(context.evaluateScript("parsed.data.value").toString(), text)
            let numbers = "parsed.timestamp === 1794650000012 && parsed.version === 2"
            XCTAssertEqual(context.evaluateScript(numbers).toBool(), true)
            XCTAssertEqual(context.evaluateScript("JSON.stringify(parsed.data[\"it's\"])").toString(), "[1.5,null]")
        }
    #endif
}
