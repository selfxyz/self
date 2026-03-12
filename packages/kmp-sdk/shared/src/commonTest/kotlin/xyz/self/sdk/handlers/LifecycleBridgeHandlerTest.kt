// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs

class LifecycleBridgeHandlerTest {
    private val json = Json

    @Test
    fun resolveLifecycleSetResult_flatPayloadWithTypeAndSuccessRoutesToSuccess() {
        val outcome =
            resolveLifecycleSetResult(
                params(
                    """
                    {
                      "type": "verification_result",
                      "success": true,
                      "userId": "user-1",
                      "verificationId": "verification-1",
                      "proof": "proof-1",
                      "claims": {
                        "ageOver18": true
                      }
                    }
                    """.trimIndent(),
                ),
            )

        val success = assertIs<LifecycleSetResultOutcome.Success>(outcome)
        assertEquals(true, success.result.success)
        assertEquals("user-1", success.result.userId)
        assertEquals("verification-1", success.result.verificationId)
        assertEquals("proof-1", success.result.proof)
        assertEquals(true, success.result.claims?.get("ageOver18"))
    }

    @Test
    fun resolveLifecycleSetResult_flatPayloadWithTypeAndErrorRoutesToFailure() {
        val outcome =
            resolveLifecycleSetResult(
                params(
                    """
                    {
                      "type": "verification_result",
                      "errorCode": "VERIFICATION_FAILED",
                      "errorMessage": "Proof generation failed"
                    }
                    """.trimIndent(),
                ),
            )

        val failure = assertIs<LifecycleSetResultOutcome.Failure>(outcome)
        assertEquals("VERIFICATION_FAILED", failure.error.code)
        assertEquals("Proof generation failed", failure.error.message)
    }

    @Test
    fun resolveLifecycleSetResult_flatPayloadWithTypeAndExplicitFalseRoutesToCancelled() {
        val outcome =
            resolveLifecycleSetResult(
                params(
                    """
                    {
                      "type": "verification_result",
                      "success": false
                    }
                    """.trimIndent(),
                ),
            )

        assertIs<LifecycleSetResultOutcome.Cancelled>(outcome)
    }

    @Test
    fun resolveLifecycleSetResult_legacyPayloadWithSuccessDataAndErrorCodeRoutesToFailure() {
        val outcome =
            resolveLifecycleSetResult(
                params(
                    """
                    {
                      "success": true,
                      "data": {
                        "success": true,
                        "userId": "user-1",
                        "verificationId": "verification-1",
                        "proof": "proof-1",
                        "claims": {
                          "ageOver18": true
                        }
                      },
                      "errorCode": "VERIFICATION_FAILED",
                      "errorMessage": "Proof generation failed"
                    }
                    """.trimIndent(),
                ),
            )

        val failure = assertIs<LifecycleSetResultOutcome.Failure>(outcome)
        assertEquals("VERIFICATION_FAILED", failure.error.code)
        assertEquals("Proof generation failed", failure.error.message)
    }

    @Test
    fun resolveLifecycleSetResult_flatPayloadWithoutTypeOrDataRoutesToSuccess() {
        val outcome =
            resolveLifecycleSetResult(
                params(
                    """
                    {
                      "success": true,
                      "userId": "user-1",
                      "verificationId": "verif-1",
                      "claims": {
                        "resultType": "proofRequested"
                      }
                    }
                    """.trimIndent(),
                ),
            )

        val success = assertIs<LifecycleSetResultOutcome.Success>(outcome)
        assertEquals(true, success.result.success)
        assertEquals("user-1", success.result.userId)
        assertEquals("verif-1", success.result.verificationId)
        assertEquals("proofRequested", success.result.claims?.get("resultType"))
    }

    @Test
    fun resolveLifecycleSetResult_bareSuccessTrueWithoutIdentifiersRoutesToCancelled() {
        val outcome =
            resolveLifecycleSetResult(
                params(
                    """
                    {
                      "success": true
                    }
                    """.trimIndent(),
                ),
            )

        assertIs<LifecycleSetResultOutcome.Cancelled>(outcome)
    }

    private fun params(rawJson: String) = json.parseToJsonElement(rawJson).jsonObject
}
