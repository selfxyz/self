// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

/**
 * A JSON value the contract does not type: `params`, `data`, a verification request. The generated
 * bridge types refer to it. [JsonText] reads and writes it. A number is a double, as in `JSON.parse`.
 */
internal sealed interface JsonValue

internal data object JsonNull : JsonValue

internal data class JsonBool(
    val value: Boolean,
) : JsonValue

internal data class JsonNumber(
    val value: Double,
) : JsonValue

internal data class JsonString(
    val value: String,
) : JsonValue

internal data class JsonArray(
    val items: List<JsonValue>,
) : JsonValue

internal data class JsonObject(
    val members: Map<String, JsonValue>,
) : JsonValue
