// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RemoteContentIntegrityTest {

    // -- normalizeSha256 --

    @Test
    fun `normalizeSha256 strips sha256- prefix`() {
        assertEquals(
            "abcdef1234567890",
            RemoteContentIntegrity.normalizeSha256("sha256-abcdef1234567890"),
        )
    }

    @Test
    fun `normalizeSha256 strips 0x prefix`() {
        assertEquals(
            "abcdef1234567890",
            RemoteContentIntegrity.normalizeSha256("0xabcdef1234567890"),
        )
    }

    @Test
    fun `normalizeSha256 strips sha256- then 0x prefix`() {
        assertEquals(
            "abcdef",
            RemoteContentIntegrity.normalizeSha256("sha256-0xabcdef"),
        )
    }

    @Test
    fun `normalizeSha256 lowercases input`() {
        assertEquals(
            "abcdef",
            RemoteContentIntegrity.normalizeSha256("ABCDEF"),
        )
    }

    @Test
    fun `normalizeSha256 returns raw hex unchanged`() {
        assertEquals(
            "abcdef1234567890",
            RemoteContentIntegrity.normalizeSha256("abcdef1234567890"),
        )
    }

    @Test
    fun `normalizeSha256 does not strip interior sha256-`() {
        assertEquals(
            "absha256-cd",
            RemoteContentIntegrity.normalizeSha256("absha256-cd"),
        )
    }

    // -- sha256Hex --

    @Test
    fun `sha256Hex produces correct hash for known input`() {
        // SHA-256 of empty byte array
        assertEquals(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            RemoteContentIntegrity.sha256Hex(byteArrayOf()),
        )
    }

    @Test
    fun `sha256Hex produces correct hash for hello`() {
        assertEquals(
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
            RemoteContentIntegrity.sha256Hex("hello".toByteArray(Charsets.UTF_8)),
        )
    }

    // -- isAcceptableContentType --

    @Test
    fun `accepts null content type`() {
        assertTrue(RemoteContentIntegrity.isAcceptableContentType(null))
    }

    @Test
    fun `accepts empty content type`() {
        assertTrue(RemoteContentIntegrity.isAcceptableContentType(""))
    }

    @Test
    fun `accepts text html`() {
        assertTrue(RemoteContentIntegrity.isAcceptableContentType("text/html"))
    }

    @Test
    fun `accepts text html with charset`() {
        assertTrue(RemoteContentIntegrity.isAcceptableContentType("text/html; charset=utf-8"))
    }

    @Test
    fun `accepts Text HTML case insensitive`() {
        assertTrue(RemoteContentIntegrity.isAcceptableContentType("Text/HTML"))
    }

    @Test
    fun `rejects application javascript`() {
        assertFalse(RemoteContentIntegrity.isAcceptableContentType("application/javascript"))
    }

    @Test
    fun `rejects application json`() {
        assertFalse(RemoteContentIntegrity.isAcceptableContentType("application/json"))
    }

    @Test
    fun `rejects text plain`() {
        assertFalse(RemoteContentIntegrity.isAcceptableContentType("text/plain"))
    }
}
