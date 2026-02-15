package xyz.self.testapp.utils

import platform.Foundation.NSLog

/**
 * iOS implementation of Logger using NSLog
 * Logs are visible in Xcode console and can be filtered by emoji prefix
 */
actual object Logger {
    actual fun d(
        tag: String,
        message: String,
    ) {
        NSLog("%@", "🔵 DEBUG [$tag] $message")
    }

    actual fun i(
        tag: String,
        message: String,
    ) {
        NSLog("%@", "ℹ️ INFO [$tag] $message")
    }

    actual fun e(
        tag: String,
        message: String,
        throwable: Throwable?,
    ) {
        if (throwable != null) {
            NSLog("%@", "🔴 ERROR [$tag] $message")
            NSLog("%@", "   ↳ Exception: ${throwable::class.simpleName}: ${throwable.message}")
            throwable.printStackTrace()
        } else {
            NSLog("%@", "🔴 ERROR [$tag] $message")
        }
    }

    actual fun w(
        tag: String,
        message: String,
    ) {
        NSLog("%@", "⚠️ WARN [$tag] $message")
    }
}
