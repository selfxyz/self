// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

internal object QueryParamsBuilder {
    fun build(
        config: SelfSdkConfig,
        request: VerificationRequest,
    ): String? {
        val parts = mutableListOf<String>()

        // Config params (always present)
        parts.add("endpoint=${urlEncode(config.endpoint)}")
        parts.add("appEndpoint=${urlEncode(config.appEndpoint ?: config.endpoint)}")
        parts.add("environment=${urlEncode(config.environment.queryValue)}")
        parts.add("version=${config.version}")

        // Optional config params
        config.appName?.let { parts.add("appName=${urlEncode(it)}") }
        config.endpointType?.let { parts.add("endpointType=${urlEncode(it)}") }
        config.chainID?.let { parts.add("chainID=$it") }

        // Request params
        request.verificationId?.let { parts.add("verificationId=${urlEncode(it)}") }
        request.userId?.let { parts.add("userId=${urlEncode(it)}") }
        request.scope?.let { parts.add("scope=${urlEncode(it)}") }
        if (request.disclosures.isNotEmpty()) {
            parts.add("disclosures=${urlEncode(request.disclosures.joinToString(","))}")
        }
        request.resultType?.let { parts.add("resultType=${urlEncode(it)}") }
        if (request.excludedCountries.isNotEmpty()) {
            parts.add("excludedCountries=${urlEncode(request.excludedCountries.joinToString(","))}")
        }
        request.userIdType?.let { parts.add("userIdType=${urlEncode(it)}") }
        request.userDefinedData?.let { parts.add("userDefinedData=${urlEncode(it)}") }
        request.selfDefinedData?.let { parts.add("selfDefinedData=${urlEncode(it)}") }

        return parts.joinToString("&").ifEmpty { null }
    }
}

internal fun urlEncode(value: String): String =
    value
        .replace("%", "%25")
        .replace("&", "%26")
        .replace("=", "%3D")
        .replace("+", "%2B")
        .replace(" ", "%20")
        .replace("#", "%23")
