// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.utils

import platform.Foundation.NSLog
import kotlin.experimental.ExperimentalNativeApi

/**
 * Sets up a global exception handler for iOS to catch uncaught Kotlin exceptions
 */
@OptIn(ExperimentalNativeApi::class)
fun setupGlobalExceptionHandler() {
    setUnhandledExceptionHook { throwable: Throwable ->
        NSLog("════════════════════════════════════════════════════════════════")
        NSLog("UNCAUGHT KOTLIN EXCEPTION")
        NSLog("════════════════════════════════════════════════════════════════")
        NSLog("Exception: ${throwable::class.simpleName}")
        NSLog("Message: ${throwable.message ?: "No message"}")
        NSLog("────────────────────────────────────────────────────────────────")
        NSLog("Stack Trace:")

        val stackTrace = throwable.getStackTrace()
        stackTrace.forEachIndexed { index, element ->
            NSLog("  $index: $element")
        }

        NSLog("════════════════════════════════════════════════════════════════")

        // Print the full throwable for additional context
        throwable.printStackTrace()
    }

    NSLog("Global exception handler installed")
}
