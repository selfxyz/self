package xyz.self.sdk.api

import kotlinx.serialization.Serializable

@Serializable
data class SelfSdkConfig(
    val endpoint: String = "https://api.self.xyz",
    val debug: Boolean = false,
)
