// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import kotlinx.serialization.decodeFromString
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive

internal val verificationResultJson =
    Json {
        ignoreUnknownKeys = true
    }

internal fun serializeVerificationResult(result: VerificationResult): String =
    verificationResultJson.encodeToString(VerificationResult.serializer(), result)

internal fun deserializeVerificationResult(json: String): VerificationResult =
    verificationResultJson.decodeFromString(VerificationResult.serializer(), json)

internal fun verificationResultFromLifecycleParams(params: Map<String, JsonElement>): VerificationResult =
    VerificationResult(
        success = true,
        userId = runCatching { params["userId"]?.jsonPrimitive?.contentOrNull }.getOrNull(),
        verificationId = runCatching { params["verificationId"]?.jsonPrimitive?.contentOrNull }.getOrNull(),
        proof = params["proof"]?.takeUnless { it is JsonNull }?.let(::lifecycleProofString),
        claims = (params["claims"] as? JsonObject)?.mapValues { (_, value) -> value.toKotlinValue() },
    )

private fun lifecycleProofString(element: JsonElement): String? =
    when (element) {
        JsonNull -> null
        is JsonObject -> element.toString()
        else -> runCatching { element.jsonPrimitive.contentOrNull }.getOrNull() ?: element.toString()
    }
