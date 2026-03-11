// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import xyz.self.sdk.bridge.BridgeHandlerException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class NfcApduPolicyTest {
    private val json = Json

    @Test
    fun requireSupportedParams_allowsStandardPassportScanParams() {
        NfcApduPolicy.requireSupportedParams(
            params(
                """
                {
                  "passportNumber": "L898902C3",
                  "dateOfBirth": "690806",
                  "dateOfExpiry": "060815",
                  "sessionId": "session-1"
                }
                """.trimIndent(),
            ),
        )
    }

    @Test
    fun requireSupportedParams_allowsEmptyApduCommandList() {
        NfcApduPolicy.requireSupportedParams(
            params(
                """
                {
                  "passportNumber": "L898902C3",
                  "dateOfBirth": "690806",
                  "dateOfExpiry": "060815",
                  "sessionId": "session-1",
                  "apduCommands": []
                }
                """.trimIndent(),
            ),
        )
    }

    @Test
    fun requireSupportedParams_rejectsNonEmptyApduCommandList() {
        val error =
            assertFailsWith<BridgeHandlerException> {
                NfcApduPolicy.requireSupportedParams(
                    params(
                        """
                        {
                          "passportNumber": "L898902C3",
                          "dateOfBirth": "690806",
                          "dateOfExpiry": "060815",
                          "sessionId": "session-1",
                          "apduCommands": ["00A4040C07A0000002471001"]
                        }
                        """.trimIndent(),
                    ),
                )
            }

        assertEquals("NFC_APDU_NOT_ALLOWED", error.code)
        assertEquals("Raw APDU commands are not supported by the KMP NFC bridge", error.message)
    }

    @Test
    fun requireSupportedParams_rejectsMalformedApduCommandParam() {
        val error =
            assertFailsWith<BridgeHandlerException> {
                NfcApduPolicy.requireSupportedParams(
                    params(
                        """
                        {
                          "passportNumber": "L898902C3",
                          "dateOfBirth": "690806",
                          "dateOfExpiry": "060815",
                          "sessionId": "session-1",
                          "apduCommands": "00A4040C07A0000002471001"
                        }
                        """.trimIndent(),
                    ),
                )
            }

        assertEquals("NFC_APDU_NOT_ALLOWED", error.code)
    }

    private fun params(rawJson: String) = json.parseToJsonElement(rawJson).jsonObject
}
