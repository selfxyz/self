// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

data class SelfSdkConfig(
    val teeUrl: String,
    val verificationId: String,
    val userId: String,
    val isDebugMode: Boolean = false,
)

class SelfSdkException(message: String) : Exception(message)

interface SelfSdkCallback {
    fun onSuccess(resultJson: String)
    fun onFailure(error: SelfSdkException)
    fun onCancelled()
}
