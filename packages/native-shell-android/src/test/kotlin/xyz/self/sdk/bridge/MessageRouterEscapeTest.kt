// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import kotlin.test.Test
import kotlin.test.assertEquals

class MessageRouterEscapeTest {
    @Test
    fun `escapeForJs escapes backslashes single quotes and line breaks`() {
        val raw = "path\\to'file\nnext\rline"

        val escaped = MessageRouter.escapeForJs(raw)

        assertEquals("'path\\\\to\\'file\\nnext\\rline'", escaped)
    }

    @Test
    fun `escapeForJs escapes unicode line separators`() {
        val raw = "before\u2028middle\u2029after"

        val escaped = MessageRouter.escapeForJs(raw)

        assertEquals("'before\\u2028middle\\u2029after'", escaped)
    }
}
