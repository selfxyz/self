// SPDX-License-Identifier: BUSL-1.1

package xyz.self.sdk.api

data class SelfSdkConfig(
    val verificationId: String,
    val userId: String,
    val environment: String = "prod",
    val isDebugMode: Boolean = false,
    val version: Int = 1,
    val scope: String? = null,
    val disclosures: List<String>? = null,
    val appName: String? = null,
    val appEndpoint: String? = null,
    val resultType: String? = null,
    val excludedCountries: List<String>? = null,
    val endpointType: String? = null,
    val userIdType: String? = null,
    val chainID: Int? = null,
    val userDefinedData: String? = null,
    val selfDefinedData: String? = null,
)

class SelfSdkException(
    message: String,
) : Exception(message)

interface SelfSdkCallback {
    fun onSuccess(resultJson: String)

    fun onFailure(error: SelfSdkException)

    fun onCancelled()
}
