// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.handlers

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import xyz.self.sdk.bridge.BridgeHandlerException

internal object NfcApduPolicy {
    private const val APDU_COMMANDS_PARAM = "apduCommands"
    private const val REJECTION_CODE = "NFC_APDU_NOT_ALLOWED"
    private const val REJECTION_MESSAGE = "Raw APDU commands are not supported by the KMP NFC bridge"

    fun requireSupportedParams(params: Map<String, JsonElement>) {
        val apduCommands = params[APDU_COMMANDS_PARAM] ?: return
        if (apduCommands == JsonNull) return
        if (apduCommands is JsonArray && apduCommands.isEmpty()) return

        throw BridgeHandlerException(REJECTION_CODE, REJECTION_MESSAGE)
    }
}
