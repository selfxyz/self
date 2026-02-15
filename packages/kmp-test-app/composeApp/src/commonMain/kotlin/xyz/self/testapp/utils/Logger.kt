package xyz.self.testapp.utils

/**
 * Cross-platform logger for debug, info, and error messages
 */
expect object Logger {
    fun d(tag: String, message: String)
    fun i(tag: String, message: String)
    fun e(tag: String, message: String, throwable: Throwable? = null)
    fun w(tag: String, message: String)
}
