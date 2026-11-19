// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

import Foundation

struct JSONParseError: Error, Equatable {
    var problem: String
    var offset: Int
}

struct JSONWriteError: Error, Equatable {}

/// Reads and writes `JSONValue` as JSON text (RFC 8259). The Kotlin library has the same rules, so
/// one body gives the same value on both platforms:
/// - A number is a double, as in `JSON.parse`. A whole number up to 2^53 in size is written with no
///   fraction and no exponent. A number too large for a double is a parse error.
/// - A key that appears twice in an object keeps its last value, as in `JSON.parse`.
/// - A `\u` escape of half a surrogate pair reads as U+FFFD.
/// - Nesting deeper than `maxDepth` is a parse error.
/// - Object keys are written in sorted order.
enum JSONText {
    static let maxDepth = 128

    /// The largest size at which every whole number is a double: 2^53.
    static let maxSafeInteger = 9_007_199_254_740_992.0

    static func parse(_ text: String) throws -> JSONValue {
        var reader = JSONReader(bytes: Array(text.utf8))
        return try reader.readDocument()
    }

    /// Throws `JSONWriteError` for a number that is not finite: JSON has no text for it.
    static func write(_ value: JSONValue) throws -> String {
        var out = ""
        try write(value, to: &out)
        return out
    }

    /// The number as a whole number, or nil when it has a fraction or is larger than 2^53.
    static func wholeNumber(_ value: Double) -> Int? {
        value.rounded(.towardZero) == value && abs(value) <= maxSafeInteger ? Int(value) : nil
    }

    private static func write(_ value: JSONValue, to out: inout String) throws {
        switch value {
        case .null:
            out += "null"
        case .bool(let bool):
            out += bool ? "true" : "false"
        case .number(let number):
            guard number.isFinite else { throw JSONWriteError() }
            out += wholeNumber(number).map(String.init) ?? "\(number)"
        case .string(let string):
            write(string, to: &out)
        case .array(let items):
            try write(items, to: &out)
        case .object(let members):
            try write(members, to: &out)
        }
    }

    private static func write(_ items: [JSONValue], to out: inout String) throws {
        out += "["
        for (index, item) in items.enumerated() {
            if index > 0 { out += "," }
            try write(item, to: &out)
        }
        out += "]"
    }

    private static func write(_ members: [String: JSONValue], to out: inout String) throws {
        out += "{"
        let keys = members.keys.sorted { $0.utf16.lexicographicallyPrecedes($1.utf16) }
        for (index, key) in keys.enumerated() {
            if index > 0 { out += "," }
            write(key, to: &out)
            out += ":"
            try write(members[key] ?? .null, to: &out)
        }
        out += "}"
    }

    private static func write(_ string: String, to out: inout String) {
        out += "\""
        for scalar in string.unicodeScalars {
            switch scalar {
            case "\"": out += "\\\""
            case "\\": out += "\\\\"
            case "\n": out += "\\n"
            case "\r": out += "\\r"
            case "\t": out += "\\t"
            case _ where scalar.value < 0x20:
                let hex = String(scalar.value, radix: 16)
                out += "\\u" + String(repeating: "0", count: 4 - hex.count) + hex
            default: out.unicodeScalars.append(scalar)
            }
        }
        out += "\""
    }
}

private enum Ascii {
    static let quote = UInt8(ascii: "\"")
    static let backslash = UInt8(ascii: "\\")
    static let minus = UInt8(ascii: "-")
    static let plus = UInt8(ascii: "+")
    static let zero = UInt8(ascii: "0")
    static let nine = UInt8(ascii: "9")
    static let space = UInt8(ascii: " ")
}

private struct JSONReader {
    let bytes: [UInt8]
    var index = 0

    mutating func readDocument() throws -> JSONValue {
        let value = try readValue(depth: 0)
        skipSpace()
        if index < bytes.count { throw fail("text after the value") }
        return value
    }

    private func fail(_ problem: String) -> JSONParseError {
        JSONParseError(problem: problem, offset: index)
    }

    private var peek: UInt8? { index < bytes.count ? bytes[index] : nil }

    private mutating func skipSpace() {
        while let byte = peek, byte == Ascii.space || byte == 0x09 || byte == 0x0A || byte == 0x0D {
            index += 1
        }
    }

    private mutating func readValue(depth: Int) throws -> JSONValue {
        skipSpace()
        guard let byte = peek else { throw fail("no value") }
        switch byte {
        case UInt8(ascii: "{"): return try readObject(depth: depth + 1)
        case UInt8(ascii: "["): return try readArray(depth: depth + 1)
        case Ascii.quote: return .string(try readString())
        case UInt8(ascii: "t"): return try readWord("true", .bool(true))
        case UInt8(ascii: "f"): return try readWord("false", .bool(false))
        case UInt8(ascii: "n"): return try readWord("null", .null)
        case Ascii.minus, Ascii.zero...Ascii.nine: return try readNumber()
        default: throw fail("unexpected character")
        }
    }

    private mutating func readWord(_ word: StaticString, _ value: JSONValue) throws -> JSONValue {
        let end = index + word.utf8CodeUnitCount
        let matches = word.withUTF8Buffer { end <= bytes.count && bytes[index..<end].elementsEqual($0) }
        guard matches else { throw fail("unexpected character") }
        index = end
        return value
    }

    private mutating func readObject(depth: Int) throws -> JSONValue {
        guard depth <= JSONText.maxDepth else { throw fail("nesting too deep") }
        index += 1
        var members: [String: JSONValue] = [:]
        skipSpace()
        if peek == UInt8(ascii: "}") {
            index += 1
            return .object(members)
        }
        while true {
            skipSpace()
            guard peek == Ascii.quote else { throw fail("expected a key") }
            let key = try readString()
            skipSpace()
            guard peek == UInt8(ascii: ":") else { throw fail("expected ':'") }
            index += 1
            members[key] = try readValue(depth: depth)
            skipSpace()
            switch peek {
            case UInt8(ascii: ","):
                index += 1
            case UInt8(ascii: "}"):
                index += 1
                return .object(members)
            default:
                throw fail("expected ',' or '}'")
            }
        }
    }

    private mutating func readArray(depth: Int) throws -> JSONValue {
        guard depth <= JSONText.maxDepth else { throw fail("nesting too deep") }
        index += 1
        var items: [JSONValue] = []
        skipSpace()
        if peek == UInt8(ascii: "]") {
            index += 1
            return .array(items)
        }
        while true {
            items.append(try readValue(depth: depth))
            skipSpace()
            switch peek {
            case UInt8(ascii: ","):
                index += 1
            case UInt8(ascii: "]"):
                index += 1
                return .array(items)
            default:
                throw fail("expected ',' or ']'")
            }
        }
    }

    private mutating func readString() throws -> String {
        index += 1
        var out: [UInt8] = []
        while true {
            guard let byte = peek else { throw fail("string with no end") }
            index += 1
            switch byte {
            case Ascii.quote:
                guard let string = String(bytes: out, encoding: .utf8) else { throw fail("bad UTF-8 in a string") }
                return string
            case Ascii.backslash:
                try readEscape(into: &out)
            case 0..<Ascii.space:
                throw fail("control character in a string")
            default:
                out.append(byte)
            }
        }
    }

    private mutating func readEscape(into out: inout [UInt8]) throws {
        guard let byte = peek else { throw fail("string with no end") }
        index += 1
        switch byte {
        case Ascii.quote, Ascii.backslash, UInt8(ascii: "/"): out.append(byte)
        case UInt8(ascii: "b"): out.append(0x08)
        case UInt8(ascii: "f"): out.append(0x0C)
        case UInt8(ascii: "n"): out.append(0x0A)
        case UInt8(ascii: "r"): out.append(0x0D)
        case UInt8(ascii: "t"): out.append(0x09)
        case UInt8(ascii: "u"): out.append(contentsOf: String(Character(try readUnicodeEscape())).utf8)
        default: throw fail("unknown escape")
        }
    }

    private mutating func readUnicodeEscape() throws -> Unicode.Scalar {
        let replacement: Unicode.Scalar = "\u{FFFD}"
        let unit = try readHexUnit()
        if let scalar = Unicode.Scalar(unit) { return scalar }
        guard UTF16.isLeadSurrogate(unit), index + 1 < bytes.count,
            bytes[index] == Ascii.backslash, bytes[index + 1] == UInt8(ascii: "u")
        else { return replacement }
        let mark = index
        index += 2
        let low = try readHexUnit()
        guard UTF16.isTrailSurrogate(low) else {
            index = mark
            return replacement
        }
        return UTF16.decode(UTF16.EncodedScalar([unit, low]))
    }

    private mutating func readHexUnit() throws -> UInt16 {
        guard index + 4 <= bytes.count else { throw fail("short \\u escape") }
        var code: UInt16 = 0
        for _ in 0..<4 {
            guard let digit = Character(Unicode.Scalar(bytes[index])).hexDigitValue else {
                throw fail("bad \\u escape")
            }
            code = code * 16 + UInt16(digit)
            index += 1
        }
        return code
    }

    private mutating func readNumber() throws -> JSONValue {
        let start = index
        if peek == Ascii.minus { index += 1 }
        if peek == Ascii.zero {
            index += 1
        } else if readDigits() == 0 {
            throw fail("bad number")
        }
        if peek == UInt8(ascii: ".") {
            index += 1
            if readDigits() == 0 { throw fail("bad number") }
        }
        if peek == UInt8(ascii: "e") || peek == UInt8(ascii: "E") {
            index += 1
            if peek == Ascii.plus || peek == Ascii.minus { index += 1 }
            if readDigits() == 0 { throw fail("bad number") }
        }
        guard let literal = String(bytes: bytes[start..<index], encoding: .utf8),
            let value = Double(literal), value.isFinite
        else { throw fail("number too large") }
        return .number(value)
    }

    private mutating func readDigits() -> Int {
        let start = index
        while let byte = peek, (Ascii.zero...Ascii.nine).contains(byte) { index += 1 }
        return index - start
    }
}
