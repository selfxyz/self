package xyz.self.sdk.api

import kotlinx.serialization.Serializable

@Serializable
data class VerificationRequest(
    val userId: String? = null,
    val scope: String? = null,
    val disclosures: List<String> = emptyList(),
)
