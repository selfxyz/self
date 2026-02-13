package xyz.self.sdk.api

data class VerificationResult(
    val success: Boolean,
    val userId: String? = null,
    val verificationId: String? = null,
    val proof: String? = null,
    val claims: Map<String, String>? = null,
)

data class SelfSdkError(
    val code: String,
    val message: String,
)

interface SelfSdkCallback {
    fun onSuccess(result: VerificationResult)
    fun onFailure(error: SelfSdkError)
    fun onCancelled()
}
