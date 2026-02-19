// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.providers

interface NfcProvider {
    fun isAvailable(): Boolean

    fun scanPassport(
        passportNumber: String,
        dateOfBirth: String,
        dateOfExpiry: String,
        onProgress: (Any) -> Unit,
        onComplete: (String) -> Unit,
        onError: (String) -> Unit,
    )

    fun cancelScan()
}
