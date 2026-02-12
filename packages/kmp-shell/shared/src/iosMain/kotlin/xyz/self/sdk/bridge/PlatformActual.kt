// SPDX-FileCopyrightText: 2025 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.bridge

import platform.Foundation.NSDate
import platform.Foundation.NSUUID
import platform.Foundation.timeIntervalSince1970

internal actual fun currentTimeMillis(): Long =
    (NSDate().timeIntervalSince1970 * 1000).toLong()

internal actual fun generateUuid(): String =
    NSUUID().UUIDString().lowercase()

actual fun currentPlatform(): Platform = Platform.IOS
