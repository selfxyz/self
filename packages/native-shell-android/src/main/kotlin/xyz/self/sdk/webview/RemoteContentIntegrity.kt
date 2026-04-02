// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import java.security.MessageDigest

// null contentType is allowed — some CDNs omit Content-Type; the SHA-256 hash is the primary integrity gate.
internal object RemoteContentIntegrity {
    fun normalizeSha256(value: String): String = value.lowercase().removePrefix("sha256-").removePrefix("0x")

    fun sha256Hex(bytes: ByteArray): String =
        MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { byte ->
            "%02x".format(byte)
        }

    fun isAcceptableContentType(rawContentType: String?): Boolean {
        val normalized = rawContentType?.substringBefore(";")?.trim()?.lowercase()
        return normalized == null || normalized == "text/html"
    }
}
