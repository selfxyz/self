// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import java.util.UUID

internal actual fun currentTimeMillis(): Long = System.currentTimeMillis()

internal actual fun generateUuid(): String = UUID.randomUUID().toString()

actual fun currentPlatform(): Platform = Platform.ANDROID // JVM target defaults to Android for tests
