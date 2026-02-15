package xyz.self.sdk.models

import kotlinx.serialization.Serializable

@Serializable
data class NfcScanParams(
    val passportNumber: String,
    val dateOfBirth: String,
    val dateOfExpiry: String,
    val canNumber: String? = null,
    val skipPACE: Boolean? = null,
    val skipCA: Boolean? = null,
    val extendedMode: Boolean? = null,
    val usePacePolling: Boolean? = null,
    val sessionId: String,
    val useCan: Boolean? = null,
    val userId: String? = null,
)
