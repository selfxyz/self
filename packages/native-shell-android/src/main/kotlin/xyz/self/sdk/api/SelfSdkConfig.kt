// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

data class SelfSdkConfig(
    val teeUrl: String,
    val verificationId: String,
    val userId: String,
    val isDebugMode: Boolean = false,
)

interface SelfSdkCallback {
    fun onSuccess(result: Map<String, Any?>)
    fun onFailure(error: Exception)
    fun onCancelled()
}
