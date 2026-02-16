// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.sdk.bridge

internal actual fun currentTimeMillis(): Long = System.currentTimeMillis()

internal actual fun generateUuid(): String =
    java.util.UUID
        .randomUUID()
        .toString()
