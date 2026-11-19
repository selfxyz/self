// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.core.bridge

import xyz.self.sdk.core.bridge.generated.BridgeError
import xyz.self.sdk.core.bridge.generated.BridgeErrorCode
import xyz.self.sdk.core.bridge.generated.BridgeErrorDetails
import xyz.self.sdk.core.bridge.generated.allowedReasons

/**
 * A failure a handler reports with a contract code (BC 7.2). A handler maps each platform error to
 * one of these. The router answers any other exception with `INTERNAL_ERROR`.
 */
internal class BridgeFailure(
    val error: BridgeError,
    cause: Throwable? = null,
) : Exception(error.message, cause) {
    init {
        error.details?.reason?.let { reason ->
            require(reason in error.code.allowedReasons) { "${error.code.wire} does not take the reason $reason" }
        }
    }

    companion object {
        /** The failure of a `details.reason` value, under the one code whose list holds it. Null for any other value. */
        fun forReason(
            reason: String,
            message: String,
        ): BridgeFailure? =
            BridgeErrorCode.entries
                .firstOrNull { reason in it.allowedReasons }
                ?.let { BridgeFailure(BridgeError(it, message, BridgeErrorDetails(reason = reason))) }
    }
}

/** BC 7.2: a [BridgeFailure] keeps its error. Any other exception is `INTERNAL_ERROR`, named by its class only. */
internal fun Throwable.toBridgeError(): BridgeError =
    (this as? BridgeFailure)?.error
        ?: BridgeError(BridgeErrorCode.INTERNAL_ERROR, "Unexpected ${this::class.java.simpleName}")
