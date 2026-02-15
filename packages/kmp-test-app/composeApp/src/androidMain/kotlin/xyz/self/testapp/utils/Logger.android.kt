package xyz.self.testapp.utils

import android.util.Log

/**
 * Android implementation of Logger using Android Log
 */
actual object Logger {
    actual fun d(tag: String, message: String) {
        Log.d(tag, message)
    }

    actual fun i(tag: String, message: String) {
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

    actual fun w(tag: String, message: String) {
        Log.w(tag, message)
    }
}
