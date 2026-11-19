// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

/// The JavaScript that native evaluates in the main frame to deliver one message (BC 3.2). The
/// message is a single-quoted JavaScript string, and the web side runs `JSON.parse` on it.
enum BridgeScript {
    static func response(_ json: String) -> String {
        "window.SelfNativeBridge._handleResponse('\(escape(json))')"
    }

    static func event(_ json: String) -> String {
        "window.SelfNativeBridge._handleEvent('\(escape(json))')"
    }

    /// Makes JSON text safe inside a single-quoted JavaScript string. One pass, so a backslash this
    /// function adds is never escaped again. U+2028 and U+2029 end a line in JavaScript source before
    /// ES2019, so they become `\u2028` and `\u2029`.
    static func escape(_ json: String) -> String {
        var out = String.UnicodeScalarView()
        for scalar in json.unicodeScalars {
            switch scalar {
            case "\\": out.append(contentsOf: "\\\\".unicodeScalars)
            case "'": out.append(contentsOf: "\\'".unicodeScalars)
            case "\n": out.append(contentsOf: "\\n".unicodeScalars)
            case "\r": out.append(contentsOf: "\\r".unicodeScalars)
            case "\u{2028}": out.append(contentsOf: "\\u2028".unicodeScalars)
            case "\u{2029}": out.append(contentsOf: "\\u2029".unicodeScalars)
            default: out.append(scalar)
            }
        }
        return String(out)
    }
}
