package xyz.self.sdk.models

import kotlinx.serialization.Serializable

@Serializable
data class NfcScanProgress(
    val step: String,
    val percent: Int,
    val message: String? = null,
)
