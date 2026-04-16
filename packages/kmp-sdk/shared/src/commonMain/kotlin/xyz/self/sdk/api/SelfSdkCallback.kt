// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.descriptors.buildClassSerialDescriptor
import kotlinx.serialization.descriptors.element
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonEncoder
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.encodeToJsonElement
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject

@Serializable
data class SelfSdkError(
    val code: String,
    val message: String,
)

@Serializable(with = VerificationResultSerializer::class)
data class VerificationResult(
    val success: Boolean,
    val userId: String? = null,
    val verificationId: String? = null,
    val proof: String? = null,
    val claims: Map<String, Any?>? = null,
    val error: SelfSdkError? = null,
)

interface SelfSdkCallback {
    fun onSuccess(result: VerificationResult)

    fun onFailure(error: SelfSdkError)

    fun onCancelled()
}

internal object VerificationResultSerializer : KSerializer<VerificationResult> {
    override val descriptor: SerialDescriptor =
        buildClassSerialDescriptor("xyz.self.sdk.api.VerificationResult") {
            element<Boolean>("success")
            element<String?>("userId", isOptional = true)
            element<String?>("verificationId", isOptional = true)
            element<String?>("proof", isOptional = true)
            element<Map<String, JsonElement>?>("claims", isOptional = true)
            element<SelfSdkError?>("error", isOptional = true)
        }

    override fun serialize(
        encoder: Encoder,
        value: VerificationResult,
    ) {
        require(encoder is JsonEncoder) { "VerificationResultSerializer only supports JSON" }

        val payload =
            buildJsonObject {
                put("success", value.success)
                value.userId?.let { put("userId", it) }
                value.verificationId?.let { put("verificationId", it) }
                value.proof?.let { put("proof", it) }
                value.claims?.let { claims ->
                    putJsonObject("claims") {
                        claims.forEach { (key, claimValue) ->
                            put(key, claimValue.toJsonElement())
                        }
                    }
                }
                value.error?.let { error ->
                    put("error", encoder.json.encodeToJsonElement(SelfSdkError.serializer(), error))
                }
            }

        encoder.encodeJsonElement(payload)
    }

    override fun deserialize(decoder: Decoder): VerificationResult {
        require(decoder is JsonDecoder) { "VerificationResultSerializer only supports JSON" }

        val payload = decoder.decodeJsonElement().jsonObject

        return VerificationResult(
            success = payload["success"]?.jsonPrimitive?.booleanOrNull ?: false,
            userId = payload["userId"]?.takeUnless { it is JsonNull }?.jsonPrimitive?.contentOrNull,
            verificationId = payload["verificationId"]?.takeUnless { it is JsonNull }?.jsonPrimitive?.contentOrNull,
            proof = payload["proof"]?.takeUnless { it is JsonNull }?.let(::jsonElementToProofString),
            claims = payload["claims"]?.takeUnless { it is JsonNull }?.jsonObject?.mapValues { (_, value) -> value.toKotlinValue() },
            error =
                payload["error"]?.takeUnless { it is JsonNull }?.let { error ->
                    decoder.json.decodeFromJsonElement(SelfSdkError.serializer(), error)
                },
        )
    }
}

private fun Any?.toJsonElement(): JsonElement =
    when (this) {
        null -> JsonNull
        is JsonElement -> this
        is String -> JsonPrimitive(this)
        is Boolean -> JsonPrimitive(this)
        is Int -> JsonPrimitive(this)
        is Long -> JsonPrimitive(this)
        is Float -> JsonPrimitive(this)
        is Double -> JsonPrimitive(this)
        is Number -> JsonPrimitive(this.toDouble())
        is Map<*, *> ->
            JsonObject(
                entries
                    .filter { it.key is String }
                    .associate { (key, value) -> key as String to value.toJsonElement() },
            )
        is List<*> -> JsonArray(map { it.toJsonElement() })
        else -> JsonPrimitive(toString())
    }

internal fun JsonElement.toKotlinValue(): Any? =
    when (this) {
        JsonNull -> null
        is JsonObject -> entries.associate { (key, value) -> key to value.toKotlinValue() }
        is JsonArray -> map { it.toKotlinValue() }
        is JsonPrimitive ->
            booleanOrNull
                ?: intOrNull
                ?: longOrNull
                ?: doubleOrNull
                ?: contentOrNull
    }

private fun jsonElementToProofString(element: JsonElement): String? =
    when (element) {
        JsonNull -> null
        is JsonPrimitive -> element.contentOrNull
        else -> element.toString()
    }
