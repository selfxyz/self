package xyz.self.sdk.api

data class VerificationRequest(
    val userId: String? = null,
    val scope: String? = null,
    val disclosures: List<String> = emptyList(),
)
