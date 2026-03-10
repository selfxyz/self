// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.api

import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class VerificationResultJsonTest {
    @Test
    fun deserializeVerificationResult_supports_canonical_claim_types() {
        val result =
            deserializeVerificationResult(
                """
                {
                  "success": true,
                  "userId": "user-1",
                  "verificationId": "verification-1",
                  "proof": "{\"proof\":\"ok\"}",
                  "claims": {
                    "nationality": "UTO",
                    "ageOver18": true,
                    "score": 42,
                    "document": {
                      "issuingCountry": "UTO"
                    },
                    "disclosures": ["nationality", "age_over_18"]
                  }
                }
                """.trimIndent(),
            )

        assertEquals("UTO", result.claims?.get("nationality"))
        assertEquals(true, result.claims?.get("ageOver18"))
        assertEquals(42, result.claims?.get("score"))
        assertEquals(
            mapOf("issuingCountry" to "UTO"),
            result.claims?.get("document"),
        )
        assertEquals(
            listOf("nationality", "age_over_18"),
            result.claims?.get("disclosures"),
        )
    }

    @Test
    fun verificationResultFromLifecycleParams_ignores_legacy_type_field() {
        val result =
            verificationResultFromLifecycleParams(
                buildJsonObject {
                    put("type", "proofRequested")
                    put("userId", "user-1")
                    putJsonObject("claims") {
                        put("ageOver18", JsonPrimitive(true))
                    }
                },
            )

        assertTrue(result.success)
        assertEquals("user-1", result.userId)
        assertEquals(mapOf("ageOver18" to true), result.claims)
        assertNull(result.error)
    }

    @Test
    fun serializeVerificationResult_roundtrips_nested_claims() {
        val encoded =
            serializeVerificationResult(
                VerificationResult(
                    success = true,
                    claims =
                        mapOf(
                            "document" to mapOf("issuingCountry" to "UTO"),
                            "scores" to listOf(1, 2, 3),
                        ),
                ),
            )

        val decoded = deserializeVerificationResult(encoded)
        assertEquals(
            mapOf("issuingCountry" to "UTO"),
            decoded.claims?.get("document"),
        )
        assertEquals(listOf(1, 2, 3), decoded.claims?.get("scores"))
    }
}
