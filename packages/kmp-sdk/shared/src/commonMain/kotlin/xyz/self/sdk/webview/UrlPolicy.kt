// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.webview

import xyz.self.sdk.api.SdkConstants

data class UrlComponents(
    val scheme: String?,
    val host: String?,
    val port: Int,
    val path: String?,
)

internal expect fun parseUrl(raw: String): UrlComponents?

object UrlPolicy {
    fun initialContentUrl(
        queryParams: String,
        effectiveDebug: Boolean,
        remoteWebAppBaseUrl: String = SdkConstants.DEFAULT_REMOTE_WEB_APP_BASE_URL,
        devServerUrl: String? = null,
    ): String {
        val baseUrl =
            when {
                effectiveDebug && devServerUrl != null -> devServerUrl.trimEnd('/')
                effectiveDebug -> "http://${SdkConstants.LOOPBACK_HOST}:${SdkConstants.DEBUG_PORT}"
                else -> {
                    require(remoteWebAppBaseUrl.startsWith("https://")) {
                        "remoteWebAppBaseUrl must use HTTPS in release builds"
                    }
                    remoteWebAppBaseUrl.trimEnd('/')
                }
            }
        return buildString {
            append(baseUrl).append(SdkConstants.BUNDLED_TOUR_PATH)
            if (queryParams.isNotEmpty()) {
                append("?").append(queryParams)
            }
        }
    }

    fun isAllowedNavigationUrl(
        rawUrl: String?,
        effectiveDebug: Boolean,
        remoteWebAppBaseUrl: String? = null,
        devServerUrl: String? = null,
    ): Boolean =
        isRemoteOrigin(rawUrl, remoteWebAppBaseUrl) ||
            isDiditUrl(rawUrl) ||
            (effectiveDebug && isDebugLocalUrl(rawUrl)) ||
            (effectiveDebug && isDevServerUrl(rawUrl, devServerUrl))

    fun isTrustedBridgeOrigin(
        rawUrl: String?,
        effectiveDebug: Boolean,
        remoteWebAppBaseUrl: String? = null,
        devServerUrl: String? = null,
    ): Boolean =
        isRemoteOrigin(rawUrl, remoteWebAppBaseUrl) ||
            (effectiveDebug && isDebugLocalUrl(rawUrl)) ||
            (effectiveDebug && isDevServerUrl(rawUrl, devServerUrl))

    fun isTrustedPermissionOrigin(
        rawUrl: String?,
        effectiveDebug: Boolean,
        remoteWebAppBaseUrl: String? = null,
        devServerUrl: String? = null,
    ): Boolean =
        isRemoteOrigin(rawUrl, remoteWebAppBaseUrl) ||
            isDiditUrl(rawUrl) ||
            (effectiveDebug && isDebugLocalUrl(rawUrl)) ||
            (effectiveDebug && isDevServerUrl(rawUrl, devServerUrl))

    internal fun isRemoteOrigin(
        rawUrl: String?,
        remoteWebAppBaseUrl: String?,
    ): Boolean {
        if (rawUrl == null || remoteWebAppBaseUrl == null) return false
        val url = parseUrl(rawUrl) ?: return false
        val remote = parseUrl(remoteWebAppBaseUrl) ?: return false
        return url.scheme == remote.scheme &&
            url.host == remote.host &&
            resolvedPort(url) == resolvedPort(remote)
    }

    internal fun isDiditUrl(rawUrl: String?): Boolean {
        if (rawUrl == null) return false
        val url = parseUrl(rawUrl) ?: return false
        return url.scheme == "https" &&
            url.host == SdkConstants.DIDIT_HOST &&
            resolvedPort(url) == 443
    }

    internal fun isDebugLocalUrl(rawUrl: String?): Boolean {
        if (rawUrl == null) return false
        val url = parseUrl(rawUrl) ?: return false
        return url.scheme == "http" &&
            url.host == SdkConstants.LOOPBACK_HOST &&
            url.port == SdkConstants.DEBUG_PORT
    }

    internal fun isDevServerUrl(
        rawUrl: String?,
        devServerUrl: String?,
    ): Boolean {
        if (rawUrl == null || devServerUrl == null) return false
        val url = parseUrl(rawUrl) ?: return false
        val dev = parseUrl(devServerUrl) ?: return false
        return url.scheme == dev.scheme &&
            url.host == dev.host &&
            resolvedPort(url) == resolvedPort(dev)
    }

    internal fun resolvedPort(components: UrlComponents): Int {
        val port = components.port
        if (port > 0) return port
        return when (components.scheme) {
            "https" -> 443
            "http" -> 80
            else -> 0
        }
    }

    fun canonicalOrigin(components: UrlComponents): String? {
        val scheme = components.scheme ?: return null
        val host = components.host ?: return null
        val port = resolvedPort(components)
        val defaultPort =
            when (scheme) {
                "https" -> 443
                "http" -> 80
                else -> -1
            }
        return if (port != defaultPort && port > 0) {
            "$scheme://$host:$port"
        } else {
            "$scheme://$host"
        }
    }

    fun allowedOrigins(
        effectiveDebug: Boolean,
        remoteWebAppBaseUrl: String,
        devServerUrl: String? = null,
    ): Set<String> {
        val origins = mutableSetOf<String>()
        val remote = parseUrl(remoteWebAppBaseUrl)
        if (remote != null && remote.scheme == "https") {
            canonicalOrigin(remote)?.let { origins.add(it) }
        }
        if (effectiveDebug) {
            origins.add("http://${SdkConstants.LOOPBACK_HOST}:${SdkConstants.DEBUG_PORT}")
            devServerUrl?.let { parseUrl(it) }?.let { dev ->
                canonicalOrigin(dev)?.let { origins.add(it) }
            }
        }
        return origins
    }

    fun navigationAllowedOrigins(
        effectiveDebug: Boolean,
        remoteWebAppBaseUrl: String,
        devServerUrl: String? = null,
    ): Set<String> {
        val origins = allowedOrigins(effectiveDebug, remoteWebAppBaseUrl, devServerUrl).toMutableSet()
        origins.add("https://${SdkConstants.DIDIT_HOST}")
        return origins
    }
}
