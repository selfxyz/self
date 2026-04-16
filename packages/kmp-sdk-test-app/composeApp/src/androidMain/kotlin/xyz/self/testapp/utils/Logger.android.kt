// SPDX-FileCopyrightText: 2025-2026 Social Connect Labs, Inc.
// SPDX-License-Identifier: BUSL-1.1
// NOTE: Converts to Apache-2.0 on 2029-06-11 per LICENSE.

package xyz.self.testapp.utils

import android.util.Log

/**
 * Android implementation of Logger using Android Log
 */
actual object Logger {
    actual fun d(
        tag: String,
        message: String,
    ) {
        Log.d(tag, message)
    }

    actual fun i(
        tag: String,
        message: String,
    ) {
        Log.i(tag, message)
    }

    actual fun e(
        tag: String,
        message: String,
        throwable: Throwable?,
    ) {
        if (throwable != null) {
            Log.e(tag, message, throwable)
        } else {
            Log.e(tag, message)
        }
    }

    actual fun w(
        tag: String,
        message: String,
    ) {
        Log.w(tag, message)
    }
}
