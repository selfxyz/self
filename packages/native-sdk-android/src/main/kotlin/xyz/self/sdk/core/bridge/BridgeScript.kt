// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

/**
 * The JavaScript that native evaluates in the main frame to deliver one message (BC 3.2). The
 * message is a single-quoted JavaScript string, and the web side runs `JSON.parse` on it.
 */
internal object BridgeScript {
    fun response(json: String): String = "window.SelfNativeBridge._handleResponse('${escape(json)}')"

    fun event(json: String): String = "window.SelfNativeBridge._handleEvent('${escape(json)}')"

    /**
     * Makes JSON text safe inside a single-quoted JavaScript string. One pass, so a backslash this
     * function adds is never escaped again. U+2028 and U+2029 end a line in JavaScript source before
     * ES2019, so they become `\u2028` and `\u2029`.
     */
    fun escape(json: String): String {
        val out = StringBuilder(json.length + ESCAPE_HEADROOM)
        for (char in json) {
            when (char) {
                '\\' -> out.append("\\\\")
                '\'' -> out.append("\\'")
                '\n' -> out.append("\\n")
                '\r' -> out.append("\\r")
                '\u2028' -> out.append("\\u2028")
                '\u2029' -> out.append("\\u2029")
                else -> out.append(char)
            }
        }
        return out.toString()
    }

    private const val ESCAPE_HEADROOM = 16
}
