// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import XCTest

@testable import SelfSdk

/// The Kotlin library has the same cases in `EnvelopeJsonTextTest`. Change both together.
final class EnvelopeJSONTextTests: XCTestCase {
    func testReadsEveryKindOfValue() throws {
        let text =
            " {\"null\":null,\"bool\":[true,false],\t\"number\":-12.5,\r\n"
            + "\"string\":\"a\",\"object\":{ },\"array\":[ ]} "

        XCTAssertEqual(
            try JSONText.parse(text),
            .object([
                "null": .null,
                "bool": .array([.bool(true), .bool(false)]),
                "number": .number(-12.5),
                "string": .string("a"),
                "object": .object([:]),
                "array": .array([])
            ])
        )
    }

    func testARepeatedKeyKeepsItsLastValue() throws {
        XCTAssertEqual(try JSONText.parse(#"{"a":1,"a":2}"#), .object(["a": .number(2)]))
    }

    func testReadsNumbersAsDoubles() throws {
        XCTAssertEqual(try JSONText.parse("0"), .number(0))
        XCTAssertEqual(try JSONText.parse("-0"), .number(-0.0))
        XCTAssertEqual(try JSONText.parse("1.5e3"), .number(1500))
        XCTAssertEqual(try JSONText.parse("15E-3"), .number(0.015))
        XCTAssertEqual(try JSONText.parse("1794650000012"), .number(1_794_650_000_012))
        XCTAssertEqual(try JSONText.parse("9007199254740993"), .number(9_007_199_254_740_992))
    }

    func testReadsStringEscapes() throws {
        XCTAssertEqual(try JSONText.parse(#""\"\\\/\b\f\n\r\t""#), .string("\"\\/\u{08}\u{0C}\n\r\t"))
        XCTAssertEqual(try JSONText.parse(#""\u0041\u00e9\u2028""#), .string("A\u{e9}\u{2028}"))
        XCTAssertEqual(try JSONText.parse("\"h\u{e9}llo \u{65e5}\u{672c}\""), .string("h\u{e9}llo \u{65e5}\u{672c}"))
        XCTAssertEqual(try JSONText.parse(#""\ud83d\ude00""#), .string("\u{1F600}"))
        XCTAssertEqual(try JSONText.parse(#""\uD83D\uDE00""#), .string("\u{1F600}"))
    }

    func testHalfASurrogatePairReadsAsTheReplacementCharacter() throws {
        XCTAssertEqual(try JSONText.parse(#""\ud83d""#), .string("\u{FFFD}"))
        XCTAssertEqual(try JSONText.parse(#""\ud83dx""#), .string("\u{FFFD}x"))
        XCTAssertEqual(try JSONText.parse(#""\ud83d\u0041""#), .string("\u{FFFD}A"))
        XCTAssertEqual(try JSONText.parse(#""\ude00\ud83d""#), .string("\u{FFFD}\u{FFFD}"))
        XCTAssertEqual(try JSONText.parse(#""\ud83d\ud83d\ude00""#), .string("\u{FFFD}\u{1F600}"))
    }

    func testRejectsTextThatIsNotJSON() {
        let bad = [
            "", " ", "{", "[", "[1,]", #"{"a":1,}"#, "{a:1}", #"{"a"}"#, #"{"a" 1}"#, "[1 2]", "'a'", "\"a", #""a\x""#,
            #""a\u12""#, #""a\u12g4""#, "\"line\nbreak\"", "\"tab\tin\"", "nul", "True", "true false",
            "{} x", "\u{FEFF}{}",
            "NaN", "Infinity", "01", "1.", ".5", "+1", "-", "1e", "1e+", "0x10", "1E400", "-1E400", "undefined"
        ]
        for text in bad {
            XCTAssertThrowsError(try JSONText.parse(text), text) { XCTAssertTrue($0 is JSONParseError) }
        }
    }

    func testRejectsNestingDeeperThanTheLimitWithoutOverflowingTheStack() throws {
        func nested(_ depth: Int) -> String {
            String(repeating: "[", count: depth) + String(repeating: "]", count: depth)
        }
        func nestedObjects(_ depth: Int) -> String {
            String(repeating: "{\"a\":", count: depth) + "1" + String(repeating: "}", count: depth)
        }

        _ = try JSONText.parse(nested(JSONText.maxDepth))
        _ = try JSONText.parse(nestedObjects(JSONText.maxDepth))
        XCTAssertThrowsError(try JSONText.parse(nested(JSONText.maxDepth + 1)))
        XCTAssertThrowsError(try JSONText.parse(nestedObjects(JSONText.maxDepth + 1)))
        XCTAssertThrowsError(try JSONText.parse(String(repeating: "[", count: 200_000)))
    }

    func testWritesKeysInSortedOrderAndNoSpace() throws {
        let value: JSONValue = .object([
            "c": .array([]),
            "b": .object(["z": .number(1), "y": .string("")]),
            "a": .array([.null, .bool(true), .bool(false)])
        ])

        XCTAssertEqual(try JSONText.write(value), #"{"a":[null,true,false],"b":{"y":"","z":1},"c":[]}"#)
    }

    func testWritesAWholeNumberWithNoFractionAndNoExponent() throws {
        XCTAssertEqual(try JSONText.write(.number(2)), "2")
        XCTAssertEqual(try JSONText.write(.number(-7)), "-7")
        XCTAssertEqual(try JSONText.write(.number(-0.0)), "0")
        XCTAssertEqual(try JSONText.write(.number(1_794_650_000_012)), "1794650000012")
        XCTAssertEqual(try JSONText.write(.number(9_007_199_254_740_992)), "9007199254740992")
        XCTAssertEqual(try JSONText.write(.number(-9_007_199_254_740_992)), "-9007199254740992")
        XCTAssertEqual(try JSONText.write(.number(1.5)), "1.5")
    }

    func testANumberOutsideTheWholeNumberRangeStillReadsBackAsTheSameDouble() throws {
        for value in [0.1, -2.5e-7, 1e22, 1.7976931348623157e308, 5e-324, 9_007_199_254_740_994] {
            XCTAssertEqual(try JSONText.parse(try JSONText.write(.number(value))), .number(value))
        }
    }

    func testRefusesToWriteANumberThatIsNotFinite() {
        for value in [Double.nan, .infinity, -.infinity] {
            XCTAssertThrowsError(try JSONText.write(.number(value))) { XCTAssertTrue($0 is JSONWriteError) }
        }
    }

    func testWritesStringEscapes() throws {
        XCTAssertEqual(
            try JSONText.write(.string("\"\\/\n\r\t\u{00}\u{08}\u{1f}")),
            #""\"\\/\n\r\t\u0000\u0008\u001f""#
        )
        XCTAssertEqual(
            try JSONText.write(.string("h\u{e9} \u{65e5} \u{1F600} \u{2028} \u{7f} '")),
            "\"h\u{e9} \u{65e5} \u{1F600} \u{2028} \u{7f} '\""
        )
    }

    func testAValueReadsBackEqualAfterAWrite() throws {
        let value: JSONValue = .object([
            "text": .string("it's \"quoted\" \\ \n \u{2029} \u{1F600} \u{01}"),
            "list": .array([.number(1), .number(0.25), .null, .object(["deep": .array([.bool(false)])])]),
            "": .string("")
        ])

        XCTAssertEqual(try JSONText.parse(try JSONText.write(value)), value)
    }

    func testWholeNumberTakesNoFractionAndNothingAboveTwoToTheFiftyThree() {
        XCTAssertEqual(JSONText.wholeNumber(2), 2)
        XCTAssertEqual(JSONText.wholeNumber(-9_007_199_254_740_992), -9_007_199_254_740_992)
        XCTAssertNil(JSONText.wholeNumber(2.5))
        XCTAssertNil(JSONText.wholeNumber(9_007_199_254_740_994))
        XCTAssertNil(JSONText.wholeNumber(1e300))
    }
}
