// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.webview

import java.net.URI

internal object RemoteNavigationPolicy {
    private const val REMOTE_SCHEME = "https"

    fun buildRemoteEntryUrl(
        baseUrl: String?,
        queryParams: String,
    ): String? {
        val normalizedBaseUrl = baseUrl?.takeIf { it.isNotBlank() } ?: return null
        val uri = parseUri(normalizedBaseUrl) ?: return null
        if (uri.scheme != REMOTE_SCHEME || uri.host.isNullOrBlank()) return null
        return buildEntryUrl(normalizedBaseUrl.trimEnd('/'), queryParams)
    }

    fun isAllowedRemoteOrigin(
        candidateUrl: String,
        baseUrl: String?,
    ): Boolean {
        val normalizedBaseUrl = baseUrl?.takeIf { it.isNotBlank() } ?: return false
        val baseUri = parseUri(normalizedBaseUrl) ?: return false
        if (baseUri.scheme != REMOTE_SCHEME || baseUri.host.isNullOrBlank()) return false
        val candidateUri = parseUri(candidateUrl) ?: return false

        return baseUri.scheme == candidateUri.scheme &&
            baseUri.host == candidateUri.host &&
            resolvePort(baseUri) == resolvePort(candidateUri)
    }

    fun resolvePort(uri: URI): Int =
        when {
            uri.port != -1 -> uri.port
            uri.scheme == REMOTE_SCHEME -> 443
            uri.scheme == "http" -> 80
            else -> -1
        }

    private fun parseUri(value: String): URI? =
        try {
            URI(value)
        } catch (_: IllegalArgumentException) {
            null
        }

    private fun buildEntryUrl(
        baseUrl: String,
        queryParams: String,
    ): String {
        val separator = if (queryParams.isEmpty()) "" else "?$queryParams"
        return "$baseUrl/tunnel/tour/1$separator"
    }
}
